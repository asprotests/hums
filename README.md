# HUMS V2 - Hormuud University Management System

A comprehensive university management system for Hormuud University, Mogadishu, Somalia.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL 15, Prisma ORM |
| Cache | Redis |
| Auth | JWT, bcrypt |
| Testing | Jest, Vitest, Supertest |
| i18n | react-i18next (English + Somali) |

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd hums-v2
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

### 4. Database Setup

```bash
pnpm db:migrate
pnpm db:seed  # Optional: seed with sample data
```

### 5. Start Development

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Health: http://localhost:3001/health

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
│   ├── database-schema.md
│   ├── api-spec.md
│   └── features/
└── docker/                  # Docker configurations
```

## Available Scripts

```bash
# Development
pnpm dev              # Start all services
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Database
pnpm db:migrate       # Run migrations
pnpm db:migrate:dev   # Create and apply migrations
pnpm db:seed          # Seed data
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test             # Run all tests

# Build
pnpm build            # Production build

# Code Quality
pnpm lint             # Run linting
pnpm format           # Format code
pnpm typecheck        # Type checking
```

## Portals

1. **Admin Portal** - System configuration, user management, reports
2. **Academic Portal** - Course management, scheduling, grading
3. **Student Portal** - Registration, grades, schedule, payments
4. **Staff Portal** - HR management, payroll, leave
5. **Finance Portal** - Billing, payments, budgeting
6. **Library Portal** - Catalog, borrowing, digital resources

## Development Phases

### Phase 1: Foundation (Prompts 01-10)
- Project setup & architecture
- Authentication & authorization
- User management
- Academic structure
- Student admission
- Basic finance
- Student portal
- i18n (English/Somali)

### Phase 2: Academic & HR
- Class management, attendance, grading
- Course registration
- HR/Staff portal, payroll

### Phase 3: Library & Integrations
- Library management
- Payment integrations
- Email/SMS notifications

## Building with Claude CLI

Execute prompts sequentially from the `prompts/` folder:

```bash
# Step 1: Project Setup
claude "Read CLAUDE.md for context, then execute prompts/01-project-setup.md"

# Verify
pnpm install && docker compose up -d && pnpm dev

# Continue with each prompt...
```

---

**Built for Hormuud University, Mogadishu, Somalia**
