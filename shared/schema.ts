import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  domain: text("domain").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  creatorUserId: varchar("creator_user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  tagsJson: jsonb("tags_json").$type<string[]>(),
  locationText: text("location_text"),
  campus: text("campus"),
  isVirtual: boolean("is_virtual").default(false),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  capacity: integer("capacity"),
  visibilityEnum: text("visibility_enum").notNull().default("company_only"), // 'company_only', 'cross_company'
  allowedDomainsJson: jsonb("allowed_domains_json").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  statusEnum: text("status_enum").notNull().default("active"), // 'active', 'cancelled', 'hidden'
});

export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  statusEnum: text("status_enum").notNull(), // 'yes', 'waitlist', 'cancelled'
  attended: boolean("attended"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterUserId: varchar("reporter_user_id").references(() => users.id).notNull(),
  targetTypeEnum: text("target_type_enum").notNull(), // 'event', 'user'
  targetId: varchar("target_id").notNull(),
  reasonText: text("reason_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  statusEnum: text("status_enum").notNull().default("open"), // 'open', 'triaged', 'closed'
});

export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  consumedAt: timestamp("consumed_at"),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id"),
  eventName: text("event_name").notNull(),
  propsJson: jsonb("props_json"),
  ts: timestamp("ts").defaultNow(),
});

export const eventComments = pgTable("event_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  parentCommentId: varchar("parent_comment_id").references(() => eventComments.id), // For replies
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startAt: true,
  endAt: true,
}).extend({
  tags: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  campus: z.string().optional(),
  startAt: z.string().transform((val) => new Date(val)),
  endAt: z.string().transform((val) => new Date(val)),
}).transform((data) => ({
  ...data,
  tagsJson: data.tags,
  allowedDomainsJson: data.allowedDomains,
  tags: undefined,
  allowedDomains: undefined,
}));

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  ts: true,
});

export const insertEventCommentSchema = createInsertSchema(eventComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type EventComment = typeof eventComments.$inferSelect;
export type InsertEventComment = z.infer<typeof insertEventCommentSchema>;
