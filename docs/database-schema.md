# HUMS V2 - Database Schema

## Overview

PostgreSQL 15+ with Prisma ORM. Uses separate schemas for modularity.

## Schemas

- `public` - Core/shared tables (users, auth)
- `academic` - Academic data (courses, enrollments, grades)
- `finance` - Financial data (payments, invoices, budgets)
- `hr` - Human resources (employees, payroll, leave)
- `library` - Library management (books, borrowings)

## Core Tables

### Users & Authentication

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String
  role          Role      @relation(fields: [roleId], references: [id])
  roleId        String
  isActive      Boolean   @default(true)
  is2FAEnabled  Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete
  
  student       Student?
  employee      Employee?
  auditLogs     AuditLog[]
  sessions      Session[]
}

model Role {
  id          String       @id @default(uuid())
  name        String       @unique // SUPER_ADMIN, ADMIN, DEAN, LECTURER, STUDENT, HR, FINANCE, LIBRARIAN
  description String?
  permissions Permission[]
  users       User[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Permission {
  id        String   @id @default(uuid())
  name      String   @unique // e.g., "users:create", "grades:update"
  resource  String   // e.g., "users", "grades"
  action    String   // e.g., "create", "read", "update", "delete"
  roles     Role[]
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

### Academic Structure

```prisma
model Faculty {
  id          String       @id @default(uuid())
  name        String
  nameLocal   String?      // Somali name
  code        String       @unique
  deanId      String?
  dean        Employee?    @relation(fields: [deanId], references: [id])
  departments Department[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
}

model Department {
  id          String    @id @default(uuid())
  name        String
  nameLocal   String?
  code        String    @unique
  facultyId   String
  faculty     Faculty   @relation(fields: [facultyId], references: [id])
  hodId       String?   // Head of Department
  programs    Program[]
  courses     Course[]
  employees   Employee[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}

model Program {
  id              String    @id @default(uuid())
  name            String
  nameLocal       String?
  code            String    @unique
  type            ProgramType // BACHELOR, DIPLOMA, CERTIFICATE, MASTER
  durationYears   Int
  totalCredits    Int
  departmentId    String
  department      Department @relation(fields: [departmentId], references: [id])
  students        Student[]
  curriculum      Curriculum[]
  feeStructures   FeeStructure[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
}

model Course {
  id            String       @id @default(uuid())
  name          String
  nameLocal     String?
  code          String       @unique
  credits       Int
  description   String?
  departmentId  String
  department    Department   @relation(fields: [departmentId], references: [id])
  prerequisites Course[]     @relation("CoursePrerequisites")
  prerequisiteFor Course[]   @relation("CoursePrerequisites")
  classes       Class[]
  curriculum    Curriculum[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?
}

model AcademicYear {
  id         String     @id @default(uuid())
  name       String     // e.g., "2025-2026"
  startDate  DateTime
  endDate    DateTime
  isCurrent  Boolean    @default(false)
  semesters  Semester[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

model Semester {
  id              String       @id @default(uuid())
  name            String       // e.g., "Fall 2025", "Spring 2026"
  academicYearId  String
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  startDate       DateTime
  endDate         DateTime
  registrationStart DateTime
  registrationEnd   DateTime
  isCurrent       Boolean      @default(false)
  classes         Class[]
  enrollments     Enrollment[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Class {
  id          String       @id @default(uuid())
  name        String       // e.g., "CS101-A"
  courseId    String
  course      Course       @relation(fields: [courseId], references: [id])
  semesterId  String
  semester    Semester     @relation(fields: [semesterId], references: [id])
  lecturerId  String
  lecturer    Employee     @relation(fields: [lecturerId], references: [id])
  capacity    Int
  roomId      String?
  room        Room?        @relation(fields: [roomId], references: [id])
  schedule    Schedule[]
  enrollments Enrollment[]
  attendances Attendance[]
  assignments Assignment[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
}
```

### Student Records

```prisma
model Student {
  id              String       @id @default(uuid())
  studentId       String       @unique // Auto-generated, e.g., "HU/2025/001"
  userId          String       @unique
  user            User         @relation(fields: [userId], references: [id])
  programId       String
  program         Program      @relation(fields: [programId], references: [id])
  admissionDate   DateTime
  expectedGraduation DateTime?
  status          StudentStatus // ACTIVE, GRADUATED, SUSPENDED, WITHDRAWN
  currentSemester Int          @default(1)
  enrollments     Enrollment[]
  payments        Payment[]
  borrowings      Borrowing[]
  attendances     StudentAttendance[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?
}

model Enrollment {
  id          String           @id @default(uuid())
  studentId   String
  student     Student          @relation(fields: [studentId], references: [id])
  classId     String
  class       Class            @relation(fields: [classId], references: [id])
  semesterId  String
  semester    Semester         @relation(fields: [semesterId], references: [id])
  status      EnrollmentStatus // REGISTERED, DROPPED, COMPLETED, FAILED
  grades      Grade[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  @@unique([studentId, classId])
}

model Grade {
  id            String     @id @default(uuid())
  enrollmentId  String
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id])
  type          GradeType  // MIDTERM, FINAL, ASSIGNMENT, QUIZ
  score         Decimal
  maxScore      Decimal
  weight        Decimal    // Percentage weight
  remarks       String?
  gradedById    String
  gradedBy      Employee   @relation(fields: [gradedById], references: [id])
  isFinalized   Boolean    @default(false)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}
```

### Employee/HR

```prisma
model Employee {
  id              String       @id @default(uuid())
  employeeId      String       @unique // e.g., "EMP/2025/001"
  userId          String       @unique
  user            User         @relation(fields: [userId], references: [id])
  departmentId    String?
  department      Department?  @relation(fields: [departmentId], references: [id])
  position        String
  employmentType  EmploymentType // FULL_TIME, PART_TIME, CONTRACT
  hireDate        DateTime
  endDate         DateTime?
  salary          Decimal
  status          EmployeeStatus // ACTIVE, ON_LEAVE, TERMINATED
  classes         Class[]      // For lecturers
  grades          Grade[]      // Grades given
  leaveRequests   LeaveRequest[]
  payrolls        Payroll[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?
}

model LeaveRequest {
  id          String      @id @default(uuid())
  employeeId  String
  employee    Employee    @relation(fields: [employeeId], references: [id])
  type        LeaveType   // ANNUAL, SICK, MATERNITY, UNPAID
  startDate   DateTime
  endDate     DateTime
  reason      String?
  status      LeaveStatus // PENDING, APPROVED, REJECTED
  approvedById String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Payroll {
  id            String   @id @default(uuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  month         Int
  year          Int
  baseSalary    Decimal
  allowances    Decimal  @default(0)
  deductions    Decimal  @default(0)
  netSalary     Decimal
  status        PayrollStatus // PENDING, PROCESSED, PAID
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([employeeId, month, year])
}
```

### Finance

```prisma
model FeeStructure {
  id          String   @id @default(uuid())
  programId   String
  program     Program  @relation(fields: [programId], references: [id])
  academicYear String
  tuitionFee  Decimal
  registrationFee Decimal
  libraryFee  Decimal
  labFee      Decimal  @default(0)
  otherFees   Json?    // Flexible for additional fees
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([programId, academicYear])
}

model Invoice {
  id          String        @id @default(uuid())
  invoiceNo   String        @unique // Auto-generated
  studentId   String
  student     Student       @relation(fields: [studentId], references: [id])
  semesterId  String
  amount      Decimal
  dueDate     DateTime
  status      InvoiceStatus // PENDING, PARTIAL, PAID, OVERDUE
  payments    Payment[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Payment {
  id            String        @id @default(uuid())
  receiptNo     String        @unique // Auto-generated
  invoiceId     String?
  invoice       Invoice?      @relation(fields: [invoiceId], references: [id])
  studentId     String
  student       Student       @relation(fields: [studentId], references: [id])
  amount        Decimal
  method        PaymentMethod // CASH, BANK_TRANSFER, MOBILE_MONEY
  reference     String?       // Transaction reference
  receivedById  String
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

### Library

```prisma
model Book {
  id            String      @id @default(uuid())
  isbn          String?     @unique
  title         String
  titleLocal    String?
  author        String
  publisher     String?
  publishYear   Int?
  categoryId    String
  category      BookCategory @relation(fields: [categoryId], references: [id])
  locationId    String?
  location      LibraryLocation? @relation(fields: [locationId], references: [id])
  totalCopies   Int         @default(1)
  availableCopies Int       @default(1)
  borrowings    Borrowing[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  deletedAt     DateTime?
}

model Borrowing {
  id          String          @id @default(uuid())
  bookId      String
  book        Book            @relation(fields: [bookId], references: [id])
  studentId   String
  student     Student         @relation(fields: [studentId], references: [id])
  borrowDate  DateTime        @default(now())
  dueDate     DateTime
  returnDate  DateTime?
  status      BorrowingStatus // BORROWED, RETURNED, OVERDUE
  lateFee     Decimal?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

### Audit & System

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  entity      String   // Table name
  entityId    String?
  oldValues   Json?
  newValues   Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

model Announcement {
  id          String    @id @default(uuid())
  title       String
  content     String
  type        AnnouncementType // SYSTEM, ACADEMIC, FINANCE
  targetRoles String[]  // Which roles can see this
  publishAt   DateTime
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## Enums

```prisma
enum ProgramType {
  CERTIFICATE
  DIPLOMA
  BACHELOR
  MASTER
}

enum StudentStatus {
  ACTIVE
  GRADUATED
  SUSPENDED
  WITHDRAWN
}

enum EnrollmentStatus {
  REGISTERED
  DROPPED
  COMPLETED
  FAILED
}

enum GradeType {
  MIDTERM
  FINAL
  ASSIGNMENT
  QUIZ
  PROJECT
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum LeaveType {
  ANNUAL
  SICK
  MATERNITY
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PayrollStatus {
  PENDING
  PROCESSED
  PAID
}

enum InvoiceStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  MOBILE_MONEY
  EVC_PLUS
}

enum BorrowingStatus {
  BORROWED
  RETURNED
  OVERDUE
}

enum AnnouncementType {
  SYSTEM
  ACADEMIC
  FINANCE
  LIBRARY
}
```

## Indexes

```prisma
// Add to models for performance
@@index([email])
@@index([studentId])
@@index([employeeId])
@@index([createdAt])
@@index([status])
@@index([semesterId])
@@index([courseId])
```
