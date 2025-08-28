import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, gte, lte, ilike, sql, count, inArray } from "drizzle-orm";
import { 
  users, companies, events, eventRsvps, reports, analyticsEvents,
  type User, type InsertUser, type Company, type InsertCompany,
  type Event, type InsertEvent, type EventRsvp, type InsertEventRsvp,
  type Report, type InsertReport, type AnalyticsEvent, type InsertAnalyticsEvent
} from "@shared/schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Companies
  getCompanyByDomain(domain: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Events
  getEvents(filters: {
    query?: string;
    tags?: string[];
    from?: Date;
    to?: Date;
    virtual?: boolean;
    campus?: string;
    userDomain: string;
  }): Promise<(Event & { creator: User; attendeeCount: number; userRsvpStatus: string | null })[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventWithDetails(id: string, userId?: string): Promise<(Event & { 
    creator: User; 
    attendees: (User & { rsvpStatus: string })[];
    userRsvpStatus: string | null;
  }) | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // RSVPs
  createRsvp(rsvp: InsertEventRsvp): Promise<EventRsvp>;
  updateRsvp(eventId: string, userId: string, status: string): Promise<EventRsvp | undefined>;
  getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | undefined>;
  getEventRsvpCount(eventId: string): Promise<{ confirmed: number; waitlist: number }>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  
  // Analytics
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsStats(adminOnly: boolean): Promise<{
    totalUsers: number;
    totalEvents: number;
    totalRsvps: number;
    recentUsers: number;
    recentEvents: number;
    recentRsvps: number;
    topTags: { tag: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getCompanyByDomain(domain: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.domain, domain)).limit(1);
    return result[0];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(company).returning();
    return result[0];
  }

  async getEvents(filters: {
    query?: string;
    tags?: string[];
    from?: Date;
    to?: Date;
    virtual?: boolean;
    campus?: string;
    userDomain: string;
  }) {
    let query = db
      .select({
        id: events.id,
        companyId: events.companyId,
        creatorUserId: events.creatorUserId,
        title: events.title,
        description: events.description,
        tagsJson: events.tagsJson,
        locationText: events.locationText,
        isVirtual: events.isVirtual,
        startAt: events.startAt,
        endAt: events.endAt,
        capacity: events.capacity,
        visibilityEnum: events.visibilityEnum,
        allowedDomainsJson: events.allowedDomainsJson,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        statusEnum: events.statusEnum,
        creator: {
          id: users.id,
          email: users.email,
          domain: users.domain,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          verifiedAt: users.verifiedAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        attendeeCount: sql<number>`COALESCE((
          SELECT COUNT(*) FROM ${eventRsvps} 
          WHERE ${eventRsvps.eventId} = ${events.id} 
          AND ${eventRsvps.statusEnum} = 'yes'
        ), 0)`,
        userRsvpStatus: sql<string | null>`(
          SELECT ${eventRsvps.statusEnum} FROM ${eventRsvps}
          WHERE ${eventRsvps.eventId} = ${events.id}
          AND ${eventRsvps.userId} = (
            SELECT ${users.id} FROM ${users} 
            WHERE ${users.domain} = ${filters.userDomain} 
            LIMIT 1
          )
          LIMIT 1
        )`,
      })
      .from(events)
      .innerJoin(users, eq(events.creatorUserId, users.id))
      .where(eq(events.statusEnum, "active"));

    if (filters.query) {
      query = query.where(
        sql`${events.title} ILIKE ${`%${filters.query}%`} OR ${events.description} ILIKE ${`%${filters.query}%`}`
      );
    }

    if (filters.from) {
      query = query.where(gte(events.startAt, filters.from));
    }

    if (filters.to) {
      query = query.where(lte(events.startAt, filters.to));
    }

    if (filters.virtual !== undefined) {
      query = query.where(eq(events.isVirtual, filters.virtual));
    }

    if (filters.campus) {
      query = query.where(ilike(events.locationText, `%${filters.campus}%`));
    }

    const result = await query.orderBy(desc(events.startAt));
    return result as any[];
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return result[0];
  }

  async getEventWithDetails(id: string, userId?: string) {
    const event = await db
      .select({
        id: events.id,
        companyId: events.companyId,
        creatorUserId: events.creatorUserId,
        title: events.title,
        description: events.description,
        tagsJson: events.tagsJson,
        locationText: events.locationText,
        isVirtual: events.isVirtual,
        startAt: events.startAt,
        endAt: events.endAt,
        capacity: events.capacity,
        visibilityEnum: events.visibilityEnum,
        allowedDomainsJson: events.allowedDomainsJson,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        statusEnum: events.statusEnum,
        creator: {
          id: users.id,
          email: users.email,
          domain: users.domain,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          verifiedAt: users.verifiedAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(events)
      .innerJoin(users, eq(events.creatorUserId, users.id))
      .where(eq(events.id, id))
      .limit(1);

    if (!event[0]) return undefined;

    const attendees = await db
      .select({
        id: users.id,
        email: users.email,
        domain: users.domain,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        verifiedAt: users.verifiedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        rsvpStatus: eventRsvps.statusEnum,
      })
      .from(eventRsvps)
      .innerJoin(users, eq(eventRsvps.userId, users.id))
      .where(and(eq(eventRsvps.eventId, id), eq(eventRsvps.statusEnum, "yes")));

    let userRsvpStatus = null;
    if (userId) {
      const userRsvp = await this.getUserRsvp(id, userId);
      userRsvpStatus = userRsvp?.statusEnum || null;
    }

    return {
      ...event[0],
      attendees,
      userRsvpStatus,
    };
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const { tags, allowedDomains, ...eventData } = event;
    const result = await db.insert(events).values({
      ...eventData,
      tagsJson: tags || [],
      allowedDomainsJson: allowedDomains || [],
    }).returning();
    return result[0];
  }

  async createRsvp(rsvp: InsertEventRsvp): Promise<EventRsvp> {
    const result = await db.insert(eventRsvps).values(rsvp).returning();
    return result[0];
  }

  async updateRsvp(eventId: string, userId: string, status: string): Promise<EventRsvp | undefined> {
    const result = await db
      .update(eventRsvps)
      .set({ statusEnum: status, updatedAt: new Date() })
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
      .returning();
    return result[0];
  }

  async getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | undefined> {
    const result = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getEventRsvpCount(eventId: string): Promise<{ confirmed: number; waitlist: number }> {
    const result = await db
      .select({
        status: eventRsvps.statusEnum,
        count: count(),
      })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId))
      .groupBy(eventRsvps.statusEnum);

    const counts = { confirmed: 0, waitlist: 0 };
    result.forEach(row => {
      if (row.status === 'yes') counts.confirmed = Number(row.count);
      if (row.status === 'waitlist') counts.waitlist = Number(row.count);
    });

    return counts;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const result = await db.insert(analyticsEvents).values(event).returning();
    return result[0];
  }

  async getAnalyticsStats(adminOnly: boolean = false) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalEvents] = await db.select({ count: count() }).from(events);
    const [totalRsvps] = await db.select({ count: count() }).from(eventRsvps);

    const [recentUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo));

    const [recentEvents] = await db
      .select({ count: count() })
      .from(events)
      .where(gte(events.createdAt, weekAgo));

    const [recentRsvps] = await db
      .select({ count: count() })
      .from(eventRsvps)
      .where(gte(eventRsvps.createdAt, weekAgo));

    // Get top tags
    const tagResults = await db
      .select({
        tags: events.tagsJson,
      })
      .from(events)
      .where(eq(events.statusEnum, "active"));

    const tagCounts: Record<string, number> = {};
    tagResults.forEach(row => {
      const tags = row.tags as string[] || [];
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalUsers: Number(totalUsers.count),
      totalEvents: Number(totalEvents.count),
      totalRsvps: Number(totalRsvps.count),
      recentUsers: Number(recentUsers.count),
      recentEvents: Number(recentEvents.count),
      recentRsvps: Number(recentRsvps.count),
      topTags,
    };
  }
}

export const storage = new DatabaseStorage();
