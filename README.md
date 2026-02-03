# HUMS V2 - Claude CLI Development Guide

This folder contains everything you need to build HUMS V2 (Hormuud University Management System) step by step using Claude CLI.

## 📁 Folder Structure

```
hums-v2-project/
├── CLAUDE.md                    # Project context (Claude CLI reads this automatically)
├── README.md                    # This file
├── docs/
│   ├── database-schema.md       # Complete Prisma schema reference
│   ├── api-spec.md              # All API endpoints
│   └── features/
│       ├── phase-1-foundation.md    # Phase 1 requirements
│       ├── phase-2-academic-hr.md   # Phase 2 requirements
│       └── phase-3-library-integrations.md  # Phase 3 requirements
└── prompts/
    ├── 01-project-setup.md          # Initialize monorepo
    ├── 02-database-schema.md        # Create Prisma schema
    ├── 03-authentication.md         # Auth system
    ├── 04-rbac-user-management.md   # Roles & user management
    ├── 05-academic-structure.md     # Faculties, departments, etc.
    ├── 06-student-admission.md      # Admission workflow
    ├── 07-finance-basic.md          # Fee & payment system
    ├── 08-student-portal.md         # Student-facing portal
    ├── 09-i18n-system-config.md     # Bilingual & settings
    └── 10-audit-testing-completion.md # Testing & Phase 1 finish
```

## 🚀 How to Use with Claude CLI

### Initial Setup

1. **Create your project folder:**
   ```bash
   mkdir hums-v2
   cd hums-v2
   ```

2. **Copy the CLAUDE.md file** to your project root:
   ```bash
   cp /path/to/hums-v2-project/CLAUDE.md .
   ```

3. **Copy the docs folder:**
   ```bash
   cp -r /path/to/hums-v2-project/docs .
   ```

### Building Step by Step

Execute prompts sequentially. Each prompt builds on the previous one.

```bash
# Step 1: Project Setup
claude "Read prompts/01-project-setup.md and execute all instructions"

# Verify it works
pnpm install
docker compose up -d
pnpm dev

# Step 2: Database Schema
claude "Read prompts/02-database-schema.md and implement the complete Prisma schema"

# Verify
pnpm db:migrate
pnpm db:studio

# Step 3: Authentication
claude "Read prompts/03-authentication.md and build the auth system"

# Continue with each prompt...
```

### Tips for Best Results

1. **One prompt at a time** - Complete and verify each step before moving on

2. **Test after each step** - Run the validation checklist in each prompt

3. **Commit frequently** - After each working step:
   ```bash
   git add .
   git commit -m "Complete: [prompt name]"
   ```

4. **Reference docs when stuck** - If Claude needs more context:
   ```bash
   claude "Check docs/database-schema.md for the Student model definition"
   ```

5. **Ask for fixes** - If something breaks:
   ```bash
   claude "The login endpoint returns 500. Check the auth service and fix it."
   ```

## 📋 Phase Overview

### Phase 1: Foundation (Prompts 01-10)
- Project setup & architecture
- Authentication & authorization
- User management
- Academic structure
- Student admission
- Basic finance
- Student portal
- i18n (English/Somali)

**Outcome:** A working system where you can create students, record payments, and students can login to see their info.

### Phase 2: Academic & HR (docs/features/phase-2-academic-hr.md)
- Class management
- Attendance system
- Grading & exams
- Course registration
- HR/Staff portal
- Payroll

**Outcome:** Complete academic cycle - register, attend, grade, view results.

### Phase 3: Library & Integrations (docs/features/phase-3-library-integrations.md)
- Library management
- Book borrowing
- Payment integrations
- Email/SMS notifications
- Advanced features

**Outcome:** Fully-featured university management system.

## 🛠 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL 15, Prisma ORM |
| Cache | Redis |
| Auth | JWT, bcrypt |
| Testing | Jest, Vitest, Supertest |
| i18n | react-i18next (English + Somali) |

## 📞 Support

This documentation was generated from the HUMS V2 Software Requirements Specification document. For questions about requirements, refer to the original SRS or the phase documentation in the `docs/features/` folder.

---

**Built for Hormuud University, Mogadishu, Somalia**
