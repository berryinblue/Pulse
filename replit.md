# Pulse - Employee Event Management Platform

## Overview

Pulse is a verified, employee-only event management platform that serves as a LinkedIn × Eventbrite × Blind hybrid for internal company events. The application enables employees to discover, create, and participate in company-specific social and professional events through domain-verified authentication. Built as a full-stack web application, it features a React frontend with TypeScript, Express.js backend, and PostgreSQL database with Drizzle ORM for type-safe database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing without the complexity of React Router
- **State Management**: TanStack React Query for server state management and caching, eliminating the need for complex global state solutions
- **UI Components**: Radix UI primitives with shadcn/ui components for accessible, customizable design system
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Authentication**: Passport.js with Google OAuth strategy for domain-verified employee authentication
- **Session Management**: Express sessions with PostgreSQL session store for persistent user sessions
- **Database Layer**: Drizzle ORM for type-safe database queries and schema management
- **API Design**: RESTful endpoints with structured error handling and request logging middleware

### Database Design
- **Primary Database**: PostgreSQL for relational data with ACID compliance
- **Schema Management**: Drizzle Kit for migrations and schema versioning
- **Core Entities**: 
  - Users (domain-verified employees)
  - Companies (domain-based organizations)
  - Events (with location, capacity, and visibility controls)
  - RSVPs (with waitlist support)
  - Reports (for moderation)
  - Analytics Events (for usage tracking)

### Authentication & Authorization
- **Identity Provider**: Google OAuth for employee verification
- **Domain Validation**: Email domain checking against allowed company domains
- **Session Security**: HTTP-only cookies with CSRF protection
- **Access Control**: Domain-based visibility for events and company-specific access

### File Structure
- **Monorepo Design**: Shared TypeScript types between client and server
- **Client Directory**: React frontend with component-based architecture
- **Server Directory**: Express API with modular route handling
- **Shared Directory**: Common schemas and type definitions using Zod validation

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL via Neon serverless for scalable data storage
- **Authentication**: Google OAuth 2.0 for employee identity verification
- **Session Store**: connect-pg-simple for PostgreSQL-backed session persistence

### Development Tools
- **ORM**: Drizzle ORM with Drizzle Kit for database schema management
- **Validation**: Zod for runtime type validation and schema definition
- **Build Process**: Vite for frontend bundling and esbuild for server compilation
- **Development**: tsx for TypeScript execution and hot reloading

### UI & Styling
- **Component Library**: Radix UI primitives for accessible base components
- **Styling Framework**: Tailwind CSS for utility-first styling approach
- **Icons**: Font Awesome and Lucide React for comprehensive icon support
- **Form Handling**: React Hook Form with Hookform Resolvers for validation

### Utility Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **HTTP Client**: TanStack React Query for data fetching and caching
- **Routing**: Wouter for lightweight client-side navigation
- **Calendar Integration**: ICS generation for calendar file exports