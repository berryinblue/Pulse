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
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "google.com,meta.com,amazon.com").split(",");
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
      return done(new Error(`ACCESS_DENIED:Only @google.com email addresses are allowed to access Pulse. Please use your Google corporate email address.`));
    }

    let user = await storage.getUserByEmail(email);
    if (!user) {
      // Create company if it doesn't exist
      let company = await storage.getCompanyByDomain(domain);
      if (!company) {
        company = await storage.createCompany({
          name: "Google",
          domain,
        });
      }

      // Create new user account
      user = await storage.createUser({
        email,
        domain,
        displayName: profile.displayName || email.split("@")[0],
        avatarUrl: profile.photos?.[0]?.value,
        verifiedAt: new Date(),
      });

      // Track new user registration
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: profile.id,
        eventName: "user_registered",
        propsJson: { domain, isNewUser: true },
      });
      
      console.log(`✅ New user registered: ${email}`);
    } else {
      // Existing user login
      await storage.createAnalyticsEvent({
        userId: user.id,
        sessionId: profile.id,
        eventName: "user_logged_in",
        propsJson: { domain, isNewUser: false },
      });
      
      console.log(`🔓 Existing user logged in: ${email}`);
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
    (req, res, next) => {
      passport.authenticate("google", { 
        session: true 
      })(req, res, (err: any) => {
        if (err) {
          console.log('🚫 Authentication error:', err.message);
          
          // Check if it's a domain restriction error
          if (err.message && err.message.startsWith('ACCESS_DENIED:')) {
            return res.redirect("/?error=domain_restricted");
          }
          
          // Other authentication errors
          return res.redirect("/?error=auth_failed");
        }
        
        // Success - redirect to main app
        res.redirect("/");
      });
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
      
      // Get the user's company based on their domain
      const company = await storage.getCompanyByDomain(user.domain);
      
      const eventData = insertEventSchema.parse({
        ...req.body,
        creatorUserId: user.id,
        companyId: company?.id || null,
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
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
        console.error("Request body:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Event creation error:", error);
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

  // Upload routes
  app.post("/api/upload/avatar", requireAuth, async (req, res) => {
    try {
      // For this demo, we'll accept base64 images
      // In production, you'd upload to cloud storage (S3, CloudFront, etc.)
      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      // Validate it's a valid base64 image
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid image format" });
      }
      
      // For demo purposes, we'll just return the base64 URL
      // In production, you'd upload to cloud storage and return the URL
      res.json({ url: imageData });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Profile routes
  app.patch("/api/me", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { displayName, avatarUrl } = req.body;
      
      const updateData: { displayName?: string; avatarUrl?: string } = {};
      
      if (displayName && typeof displayName === 'string') {
        updateData.displayName = displayName;
      }
      
      if (avatarUrl && typeof avatarUrl === 'string') {
        updateData.avatarUrl = avatarUrl;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid update data provided" });
      }

      const updatedUser = await storage.updateUser(user.id, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/users/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userEvents = await storage.getUserEvents(user.id);
      res.json(userEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  app.get("/api/events/created", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const createdEvents = await storage.getEventsByCreator(user.id);
      res.json(createdEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch created events" });
    }
  });

  app.get("/api/events/rsvped", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const rsvpedEvents = await storage.getEventsByRsvp(user.id);
      res.json(rsvpedEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSVP'd events" });
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
