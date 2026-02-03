# Phase 1: Foundation & Core MVP

## Overview
Phase 1 establishes the project foundation and implements must-have features for a functional system.

## Duration Target: 4-6 weeks

---

## 1.1 Project Setup

### Infrastructure
- [x] Monorepo structure with pnpm workspaces
- [ ] Docker configuration for PostgreSQL, Redis
- [ ] ESLint, Prettier, TypeScript configs
- [ ] Environment variable management
- [ ] Git hooks (Husky) for pre-commit

### Backend (apps/api)
- [ ] Express.js with TypeScript
- [ ] Prisma ORM setup
- [ ] Database connection pooling
- [ ] Request validation (Zod)
- [ ] Error handling middleware
- [ ] Logging (Winston/Pino)
- [ ] API documentation (Swagger)

### Frontend (apps/web)
- [ ] React 18 + TypeScript + Vite
- [ ] TailwindCSS + Shadcn/ui
- [ ] React Router v6
- [ ] React Query for data fetching
- [ ] Form handling (React Hook Form + Zod)
- [ ] i18n setup (English + Somali)

---

## 1.2 Authentication System

### Requirements (from SRS)
| Req ID | Requirement |
|--------|-------------|
| ADM-UM-001 | User accounts with unique email/username |
| ADM-UM-004 | Account activation/deactivation |
| ADM-UM-006 | Password policies (complexity, expiry) |
| ADM-UM-008 | Self-service password reset |

### Implementation
- [ ] User registration (admin-created only for MVP)
- [ ] Login with email/password
- [ ] JWT access tokens (15 min expiry)
- [ ] Refresh tokens (7 day expiry)
- [ ] Password hashing with bcrypt
- [ ] Password reset via email
- [ ] Session management
- [ ] Logout (token invalidation)

### Security
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Secure cookie settings
- [ ] CORS configuration

---

## 1.3 Role-Based Access Control (RBAC)

### Requirements
| Req ID | Requirement |
|--------|-------------|
| ADM-UM-003 | RBAC with customizable roles and permissions |
| ADM-UM-005 | User activity logs with timestamps |

### Default Roles
1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Admin portal access
3. **DEAN** - Faculty management + reports
4. **HOD** - Department management
5. **LECTURER** - Academic portal
6. **STUDENT** - Student portal
7. **HR_STAFF** - HR portal
8. **FINANCE_STAFF** - Finance portal
9. **LIBRARIAN** - Library portal

### Implementation
- [ ] Role model with permissions
- [ ] Permission-based route guards
- [ ] Permission checking middleware
- [ ] Activity logging for all actions

---

## 1.4 Admin Portal - Basic

### User Management
| Req ID | Requirement |
|--------|-------------|
| ADM-UM-001 | Create user accounts |
| ADM-UM-002 | Bulk import via CSV |
| ADM-UM-004 | Activate/deactivate accounts |

**Features:**
- [ ] User list with pagination, search, filters
- [ ] Create user form
- [ ] Edit user details
- [ ] Activate/deactivate toggle
- [ ] CSV import for bulk users
- [ ] User activity view

### Academic Structure
| Req ID | Requirement |
|--------|-------------|
| ADM-AS-001 | Manage faculties |
| ADM-AS-002 | Manage departments |
| ADM-AS-003 | Manage programs |
| ADM-AS-004 | Define courses |
| ADM-AS-005 | Manage academic years/semesters |

**Features:**
- [ ] Faculty CRUD
- [ ] Department CRUD (linked to faculty)
- [ ] Program CRUD (linked to department)
- [ ] Course CRUD (with prerequisites)
- [ ] Academic year/semester management

---

## 1.5 Student Admission (Basic)

### Requirements
| Req ID | Requirement |
|--------|-------------|
| ADM-SA-001 | Application form with document upload |
| ADM-SA-003 | Auto-generate student ID |
| ADM-SA-006 | Maintain admission documents |
| ADM-SA-010 | Admission statistics |

### Implementation
- [ ] Student admission form
- [ ] Document upload (ID, certificates)
- [ ] Auto-generate student ID (format: HU/YYYY/XXX)
- [ ] Basic admission workflow (Apply → Approve → Enroll)
- [ ] Student profile creation
- [ ] Link student to program

---

## 1.6 Student Portal - Basic

### Requirements
| Req ID | Requirement |
|--------|-------------|
| STU-RP-001 | Student profile view |
| STU-RP-002 | Enrollment status display |
| STU-FN-001 | Fee structure display |
| STU-FN-002 | Account statement |
| STU-FN-003 | Outstanding balance |

### Implementation
- [ ] Student dashboard
- [ ] Profile view/edit (contact info only)
- [ ] Current enrollment status
- [ ] Fee structure view
- [ ] Payment history
- [ ] Outstanding balance display

---

## 1.7 Finance Portal - Basic

### Requirements
| Req ID | Requirement |
|--------|-------------|
| FIN-AR-001 | Generate student invoices |
| FIN-AR-002 | Process fee payments |
| FIN-AR-003 | Generate payment receipts |
| FIN-AR-004 | Track outstanding balances |

### Implementation
- [ ] Fee structure management
- [ ] Invoice generation
- [ ] Payment recording (cash/bank)
- [ ] Receipt generation (PDF)
- [ ] Outstanding balance report
- [ ] Basic collection report

---

## 1.8 System Configuration

### Requirements
| Req ID | Requirement |
|--------|-------------|
| ADM-SC-001 | System settings (branding, timezone) |
| ADM-SC-005 | Multi-language (English, Somali) |
| ADM-SC-006 | Audit logging |

### Implementation
- [ ] System settings page
- [ ] University branding (logo, name)
- [ ] Timezone configuration
- [ ] Language switcher (en/so)
- [ ] Audit log viewer

---

## Database Migrations for Phase 1

```
001_create_users_and_auth.sql
002_create_roles_permissions.sql
003_create_faculties_departments.sql
004_create_programs_courses.sql
005_create_academic_years_semesters.sql
006_create_students.sql
007_create_fee_structures.sql
008_create_invoices_payments.sql
009_create_audit_logs.sql
010_create_system_config.sql
```

---

## Testing Requirements

### Unit Tests
- [ ] Auth service tests
- [ ] RBAC permission tests
- [ ] Student ID generation

### Integration Tests
- [ ] Login flow
- [ ] User CRUD
- [ ] Student admission flow
- [ ] Payment recording

### E2E Tests (basic)
- [ ] Login/logout
- [ ] Admin creates student
- [ ] Student views profile

---

## Definition of Done (Phase 1)

- [ ] All "Must" requirements for included modules implemented
- [ ] Database migrations working
- [ ] API endpoints documented in Swagger
- [ ] Basic test coverage (>60% for services)
- [ ] UI working in English and Somali
- [ ] Can create admin, admit student, record payment
- [ ] Audit logs capturing all changes
