# HUMS V2 - Hormuud University Management System

## Project Overview

HUMS V2 is a comprehensive university management system for Hormuud University, Mogadishu, Somalia. This is a complete rebuild of HUMS V1 (developed 2020-2022) using modern technologies.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js 18+ with TypeScript, Shadcn/ui, TailwindCSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| Auth | JWT + OAuth 2.0, bcrypt/Argon2 |
| Cache | Redis |
| File Storage | MinIO (S3 compatible) |
| API Docs | OpenAPI 3.0 (Swagger) |

## Project Structure

```
hums-v2/
├── apps/
│   ├── web/                 # React frontend (all portals)
│   └── api/                 # Node.js/Express backend
├── packages/
│   ├── database/            # Prisma schema & migrations
│   ├── shared/              # Shared types, utils, constants
│   └── ui/                  # Shared UI components
├── docs/                    # Documentation
└── docker/                  # Docker configurations
```

## Six Main Portals

1. **Admin Portal** - System config, user management, reports, audit logs
2. **Academic Portal** - Course management, scheduling, grading, attendance
3. **Student Portal** - Registration, grades, schedule, payments, library
4. **Staff Portal** - HR management, payroll, leave, evaluations
5. **Finance Portal** - Billing, payments, budgeting, financial reports
6. **Library Portal** - Catalog, borrowing, digital resources, reservations

## Database Design Principles

- Normalized schema (3NF minimum)
- Soft deletes for audit trails
- UUID primary keys
- Separate schemas: `academic`, `finance`, `hr`, `library`
- Audit tables for all modifications
- Prisma migrations with version control

## Core Entities

- User, Student, Employee, Course, Class, Enrollment
- Payment, Attendance, Grade, Book, Department, Faculty

## Key Constraints

- Bilingual support: English + Somali (RTL)
- Works with intermittent internet (offline mode for critical functions)
- Low-bandwidth optimization
- Mobile-responsive (320px to 4K)
- HUMS V1 data migration compatibility

## Development Phases

### Phase 1 (MVP) - "Must" Requirements
- Core auth & user management
- Admin portal basics
- Student registration & profiles
- Basic academic structure
- Essential finance (fee structure, payments)

### Phase 2 - "Should" Requirements
- Full academic portal (attendance, grading)
- HR/Staff portal
- Advanced finance features
- Library basics

### Phase 3 - "Could" Requirements
- Advanced integrations (SMS, payment gateways)
- Mobile apps
- Analytics dashboards
- SSO/SAML

## Security Requirements

- TLS 1.3 encryption
- bcrypt/Argon2 password hashing
- CSRF protection
- Rate limiting on auth endpoints
- 30-minute session timeout
- SQL injection & XSS prevention
- Comprehensive audit logging

## Performance Targets

- Page load: < 3 seconds
- API response (simple): < 500ms
- API response (complex): < 5 seconds
- Concurrent users: 1,000+
- No query > 2 seconds

## Commands Reference

```bash
# Development
pnpm dev              # Start all services
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed data
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test             # Run all tests
pnpm test:api         # API tests only

# Build
pnpm build            # Production build
```

## Current Development Status

Phase: **Not Started - Ready for Phase 1 Setup**

## Notes for Claude

- Always check `docs/features/` for detailed requirements before implementing
- Follow the phased approach - complete Phase 1 before moving to Phase 2
- Ensure all code supports bilingual (en/so) from the start
- Write tests for critical paths (auth, payments, grades)
- Use Prisma for all database operations
- Follow REST conventions for API endpoints
