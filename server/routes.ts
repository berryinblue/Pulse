import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { z } from "zod";
import { storage } from "./storage";
import { insertEventSchema, insertReportSchema } from "@shared/schema";
import ics from "ics";

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "pulse-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "google.com,gmail.com").split(",");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");

// Get the current URL dynamically
const getCallbackURL = () => {
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  const domains = process.env.REPLIT_DOMAINS;
  
  let callbackUrl;
  if (devDomain) {
    callbackUrl = `https://${devDomain}/api/auth/google/callback`;
  } else if (domains) {
    // Use the first domain from REPLIT_DOMAINS
    const firstDomain = domains.split(',')[0];
    callbackUrl = `https://${firstDomain}/api/auth/google/callback`;
  } else {
    // Fallback for local development
    callbackUrl = "http://localhost:5000/api/auth/google/callback";
  }
  
  console.log(`🔑 OAuth Callback URL: ${callbackUrl}`);
  return callbackUrl;
};

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: getCallbackURL()
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("No email found in Google profile"));
    }

    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return done(new Error(`Domain ${domain} is not allowed`));
    }

    let user = await storage.getUserByEmail(email);
    if (!user) {
      // Create company if it doesn't exist
      let company = await storage.getCompanyByDomain(domain);
      if (!company) {
        company = await storage.createCompany({
          name: domain.charAt(0).toUpperCase() + domain.slice(1),
          domain,
        });
      }

      user = await storage.createUser({
        email,
        domain,
        displayName: profile.displayName || email.split("@")[0],
        avatarUrl: profile.photos?.[0]?.value,
        verifiedAt: new Date(),
      });

      // Track signup
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: profile.id,
        eventName: "user_signed_up",
        propsJson: { domain },
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || !ADMIN_EMAILS.includes((req.user as any).email)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session and passport middleware
  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get("/api/auth/google", (req, res, next) => {
    // Add headers to prevent iframe blocking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/?error=auth" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Events routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { query, tags, from, to, virtual, campus } = req.query;
      
      const filters = {
        query: query as string,
        tags: tags ? (tags as string).split(",") : undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        virtual: virtual ? virtual === "true" : undefined,
        campus: campus as string,
        userDomain: user.domain,
      };

      const events = await storage.getEvents(filters);
      
      // Track feed view
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: "feed_viewed",
        propsJson: { filters },
      });

      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const eventData = insertEventSchema.parse({
        ...req.body,
        creatorUserId: user.id,
      });

      const event = await storage.createEvent(eventData);

      // Track event creation
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: "event_created",
        propsJson: {
          eventId: event.id,
          tags: eventData.tags,
          capacity: eventData.capacity,
          visibility: eventData.visibilityEnum,
        },
      });

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const event = await storage.getEventWithDetails(req.params.id, user.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Track event view
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: "event_viewed",
        propsJson: { eventId: event.id },
      });

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events/:id/rsvp", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const eventId = req.params.id;
      const { status } = z.object({ status: z.enum(["yes", "no"]) }).parse(req.body);

      if (status === "no") {
        // Cancel RSVP
        const existingRsvp = await storage.getUserRsvp(eventId, user.id);
        if (existingRsvp) {
          await storage.updateRsvp(eventId, user.id, "cancelled");
          await storage.createAnalyticsEvent({
            userId: user.id,
            sessionId: req.sessionID,
            eventName: "rsvp_cancel",
            propsJson: { eventId },
          });
        }
        return res.json({ message: "RSVP cancelled" });
      }

      // Check capacity
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const rsvpCounts = await storage.getEventRsvpCount(eventId);
      const finalStatus = event.capacity && rsvpCounts.confirmed >= event.capacity ? "waitlist" : "yes";

      // Create or update RSVP
      const existingRsvp = await storage.getUserRsvp(eventId, user.id);
      if (existingRsvp) {
        await storage.updateRsvp(eventId, user.id, finalStatus);
      } else {
        await storage.createRsvp({
          eventId,
          userId: user.id,
          statusEnum: finalStatus,
        });
      }

      // Track RSVP
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: finalStatus === "yes" ? "rsvp_yes" : "rsvp_waitlist",
        propsJson: { eventId },
      });

      res.json({ status: finalStatus, message: finalStatus === "yes" ? "RSVP confirmed" : "Added to waitlist" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RSVP data" });
      }
      res.status(500).json({ message: "Failed to RSVP" });
    }
  });

  app.get("/api/events/:id/ics", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const icsEvent = {
        title: event.title,
        description: event.description || "",
        start: [
          event.startAt.getFullYear(),
          event.startAt.getMonth() + 1,
          event.startAt.getDate(),
          event.startAt.getHours(),
          event.startAt.getMinutes()
        ] as [number, number, number, number, number],
        end: [
          event.endAt.getFullYear(),
          event.endAt.getMonth() + 1,
          event.endAt.getDate(),
          event.endAt.getHours(),
          event.endAt.getMinutes()
        ] as [number, number, number, number, number],
        location: event.locationText || "",
        uid: event.id,
        organizer: { name: "Pulse Events", email: "noreply@pulse.com" },
      };

      const { error, value } = ics.createEvent(icsEvent);
      
      if (error) {
        return res.status(500).json({ message: "Failed to generate calendar file" });
      }

      // Track ICS download
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: "ics_downloaded",
        propsJson: { eventId: event.id },
      });

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${event.title}.ics"`);
      res.send(value);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar file" });
    }
  });

  // Reports routes
  app.post("/api/events/:id/report", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const reportData = insertReportSchema.parse({
        reporterUserId: user.id,
        targetTypeEnum: "event",
        targetId: req.params.id,
        reasonText: req.body.reason,
      });

      const report = await storage.createReport(reportData);

      // Track report submission
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: req.sessionID,
        eventName: "report_submitted",
        propsJson: { target: "event", targetId: req.params.id },
      });

      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data" });
      }
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAnalyticsStats(true);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Health check
  app.get("/api/healthz", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
