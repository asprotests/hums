# HUMS V2 - API Specification

## Overview

RESTful API following OpenAPI 3.0. All endpoints prefixed with `/api/v1`.

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Base URL

```
Development: http://localhost:3001/api/v1
Production: https://api.hums.edu.so/api/v1
```

---

## Auth Endpoints

### POST /auth/login
Login and receive tokens.

**Request:**
```json
{
  "email": "user@hormuud.edu.so",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 1800,
  "user": {
    "id": "uuid",
    "email": "user@hormuud.edu.so",
    "role": "STUDENT"
  }
}
```

### POST /auth/logout
Invalidate current session.

### POST /auth/refresh
Refresh access token.

### POST /auth/forgot-password
Request password reset.

### POST /auth/reset-password
Reset password with token.

### POST /auth/2fa/enable
Enable 2FA for user.

### POST /auth/2fa/verify
Verify 2FA code.

---

## User Management

### GET /users
List all users (Admin only).

**Query params:** `page`, `limit`, `role`, `status`, `search`

### POST /users
Create new user.

### GET /users/:id
Get user by ID.

### PATCH /users/:id
Update user.

### DELETE /users/:id
Soft delete user.

### POST /users/bulk-import
Import users from CSV/Excel.

### GET /users/:id/activity
Get user activity logs.

---

## Students

### GET /students
List students with filters.

**Query params:** `page`, `limit`, `programId`, `status`, `facultyId`, `search`

### POST /students
Create student (with user account).

### GET /students/:id
Get student details.

### PATCH /students/:id
Update student.

### GET /students/:id/enrollments
Get student's enrollments.

### GET /students/:id/grades
Get student's grades.

### GET /students/:id/payments
Get student's payment history.

### GET /students/:id/attendance
Get student's attendance records.

### GET /students/:id/transcript
Generate unofficial transcript.

---

## Academic Structure

### Faculties

```
GET    /faculties
POST   /faculties
GET    /faculties/:id
PATCH  /faculties/:id
DELETE /faculties/:id
GET    /faculties/:id/departments
GET    /faculties/:id/statistics
```

### Departments

```
GET    /departments
POST   /departments
GET    /departments/:id
PATCH  /departments/:id
DELETE /departments/:id
GET    /departments/:id/programs
GET    /departments/:id/courses
GET    /departments/:id/employees
```

### Programs

```
GET    /programs
POST   /programs
GET    /programs/:id
PATCH  /programs/:id
DELETE /programs/:id
GET    /programs/:id/curriculum
GET    /programs/:id/students
GET    /programs/:id/fee-structure
```

### Courses

```
GET    /courses
POST   /courses
GET    /courses/:id
PATCH  /courses/:id
DELETE /courses/:id
GET    /courses/:id/prerequisites
GET    /courses/:id/classes
```

---

## Classes & Enrollment

### Classes

```
GET    /classes
POST   /classes
GET    /classes/:id
PATCH  /classes/:id
DELETE /classes/:id
GET    /classes/:id/students
GET    /classes/:id/attendance
GET    /classes/:id/grades
POST   /classes/:id/materials      # Upload course materials
```

### Enrollments

```
POST   /enrollments                 # Register for class
DELETE /enrollments/:id             # Drop class
GET    /enrollments/:id
PATCH  /enrollments/:id/status
```

---

## Attendance

### POST /attendance/mark
Mark attendance for a class.

**Request:**
```json
{
  "classId": "uuid",
  "date": "2025-02-15",
  "records": [
    { "studentId": "uuid", "status": "PRESENT" },
    { "studentId": "uuid", "status": "ABSENT" },
    { "studentId": "uuid", "status": "LATE" }
  ]
}
```

### GET /attendance/class/:classId
Get attendance for a class.

### GET /attendance/student/:studentId
Get student's attendance.

### PATCH /attendance/:id
Correct attendance record.

---

## Grades & Examinations

### POST /grades
Enter grades.

**Request:**
```json
{
  "classId": "uuid",
  "type": "MIDTERM",
  "maxScore": 100,
  "weight": 30,
  "grades": [
    { "studentId": "uuid", "score": 85 },
    { "studentId": "uuid", "score": 72 }
  ]
}
```

### PATCH /grades/:id
Update grade.

### POST /grades/finalize
Finalize grades (locks them).

### GET /grades/class/:classId
Get all grades for a class.

### GET /grades/report/:classId
Generate grade report.

---

## Finance

### Invoices

```
GET    /invoices
POST   /invoices/generate           # Generate for semester
GET    /invoices/:id
GET    /invoices/student/:studentId
```

### Payments

```
GET    /payments
POST   /payments                    # Record payment
GET    /payments/:id
GET    /payments/:id/receipt        # Generate receipt PDF
GET    /payments/student/:studentId
```

### Fee Structures

```
GET    /fee-structures
POST   /fee-structures
GET    /fee-structures/:id
PATCH  /fee-structures/:id
```

### Reports

```
GET    /finance/reports/collection  # Collection report
GET    /finance/reports/outstanding # Outstanding balances
GET    /finance/reports/summary     # Financial summary
```

---

## HR / Staff

### Employees

```
GET    /employees
POST   /employees
GET    /employees/:id
PATCH  /employees/:id
DELETE /employees/:id
GET    /employees/:id/payroll
GET    /employees/:id/leave
```

### Leave Management

```
GET    /leave-requests
POST   /leave-requests
GET    /leave-requests/:id
PATCH  /leave-requests/:id/approve
PATCH  /leave-requests/:id/reject
GET    /leave-requests/employee/:id
```

### Payroll

```
GET    /payroll
POST   /payroll/process             # Process monthly payroll
GET    /payroll/:id
GET    /payroll/:id/payslip         # Generate payslip PDF
PATCH  /payroll/:id/mark-paid
```

---

## Library

### Books

```
GET    /books
POST   /books
GET    /books/:id
PATCH  /books/:id
DELETE /books/:id
GET    /books/search?q=keyword
GET    /books/available
```

### Borrowings

```
GET    /borrowings
POST   /borrowings                  # Borrow book
GET    /borrowings/:id
POST   /borrowings/:id/return       # Return book
GET    /borrowings/student/:id
GET    /borrowings/overdue
```

### Categories & Locations

```
GET    /book-categories
POST   /book-categories
GET    /library-locations
POST   /library-locations
```

---

## Reports & Analytics

### GET /reports/enrollment
Enrollment statistics.

### GET /reports/academic-performance
Academic performance by faculty/department.

### GET /reports/financial-summary
Financial overview.

### GET /reports/attendance-summary
Attendance statistics.

### GET /reports/library-usage
Library usage statistics.

### POST /reports/custom
Generate custom report with filters.

---

## System

### Announcements

```
GET    /announcements
POST   /announcements
GET    /announcements/:id
PATCH  /announcements/:id
DELETE /announcements/:id
```

### Audit Logs

```
GET    /audit-logs                  # Admin only
GET    /audit-logs/entity/:type/:id
```

### System Config

```
GET    /config
PATCH  /config
GET    /config/:key
```

---

## Common Response Formats

### Success (Single Item)
```json
{
  "success": true,
  "data": { ... }
}
```

### Success (List)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| CONFLICT | 409 | Resource conflict |
| INTERNAL_ERROR | 500 | Server error |
