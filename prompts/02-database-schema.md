# Prompt 02: Complete Database Schema

## Objective
Implement the full Prisma schema based on docs/database-schema.md

## Instructions

1. **Read the schema documentation:**
   - Review `docs/database-schema.md` for all models
   - Note the relationships and constraints

2. **Implement all models in packages/database/prisma/schema.prisma:**

   **Core/Auth:**
   - User (with soft delete)
   - Role
   - Permission (many-to-many with Role)
   - Session
   - AuditLog

   **Academic Structure:**
   - Faculty
   - Department
   - Program
   - Course (with self-referential prerequisites)
   - AcademicYear
   - Semester
   - Class
   - Room
   - Schedule

   **Students:**
   - Student (linked to User)
   - Enrollment
   - Grade
   - StudentAttendance

   **Employees:**
   - Employee (linked to User)
   - LeaveRequest
   - Payroll
   - EmployeeAttendance

   **Finance:**
   - FeeStructure
   - Invoice
   - Payment
   - Scholarship
   - Vendor
   - Expense
   - Budget

   **Library:**
   - Book
   - BookCategory
   - LibraryLocation
   - Borrowing

   **System:**
   - SystemConfig
   - Announcement

3. **Include all enums as defined in schema doc**

4. **Add proper indexes for performance:**
   - Email on User
   - StudentId on Student
   - Common query fields

5. **Create seed file:**
   - packages/database/prisma/seed.ts
   - Seed default roles and permissions
   - Seed a super admin user
   - Seed sample academic structure (1 faculty, 1 dept, 1 program)

## Commands to Implement
```bash
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed default data
pnpm db:reset      # Reset DB (migrate reset + seed)
pnpm db:studio     # Open Prisma Studio
```

## Validation
- `pnpm db:migrate` runs without errors
- `pnpm db:studio` shows all tables
- `pnpm db:seed` creates:
  - Roles: SUPER_ADMIN, ADMIN, DEAN, HOD, LECTURER, STUDENT, HR_STAFF, FINANCE_STAFF, LIBRARIAN
  - Permissions for each resource (users, students, courses, etc.)
  - One super admin user (admin@hormuud.edu.so / Admin123!)

## Validation Checklist

- [ ] `prisma/schema.prisma` file exists
- [ ] All models defined (User, Student, Employee, etc.)
- [ ] All enums defined
- [ ] All relations properly configured
- [ ] `npx prisma generate` runs without errors
- [ ] `npx prisma migrate dev` runs without errors
- [ ] Database tables created in PostgreSQL
- [ ] Prisma Client generated successfully
- [ ] Can connect to database from backend
- [ ] Seed file exists (`prisma/seed.ts`)