# Prompt 12: Course Registration

## Objective
Implement student course registration system with prerequisites checking and enrollment management.

## Location in Project
Place this file in: `hums-v2-project/prompts/12-course-registration.md`

---

## Backend Implementation

### 1. Registration Period Service (src/services/registrationPeriod.service.ts)
```typescript
interface RegistrationPeriod {
  id: string;
  semesterId: string;
  type: 'REGULAR' | 'LATE' | 'DROP_ADD';
  startDate: DateTime;
  endDate: DateTime;
  lateFee?: number;       // Fee for late registration
  isActive: boolean;
}

createPeriod(data: CreatePeriodDto)
getPeriods(semesterId: string)
updatePeriod(id: string, data: UpdatePeriodDto)
deletePeriod(id: string)
getCurrentPeriod(semesterId: string): RegistrationPeriod | null
isRegistrationOpen(semesterId: string): boolean
```

### 2. Enrollment Service (src/services/enrollment.service.ts)
```typescript
interface EnrollmentRequest {
  studentId: string;
  classId: string;
}

interface EnrollmentResult {
  success: boolean;
  enrollment?: Enrollment;
  error?: {
    code: string;
    message: string;
  };
}

// Main operations
registerForClass(studentId: string, classId: string): EnrollmentResult
dropClass(studentId: string, classId: string): EnrollmentResult
getStudentEnrollments(studentId: string, semesterId?: string)
getClassEnrollments(classId: string)

// Validation helpers
checkPrerequisites(studentId: string, courseId: string): PrerequisiteResult
checkCapacity(classId: string): boolean
checkScheduleConflict(studentId: string, classId: string): ConflictResult[]
checkRegistrationHold(studentId: string): Hold[]
checkFinancialHold(studentId: string): boolean

// Bulk operations
bulkRegister(studentId: string, classIds: string[]): EnrollmentResult[]
bulkDrop(studentId: string, classIds: string[]): EnrollmentResult[]

// Admin operations
forceEnroll(studentId: string, classId: string, reason: string): Enrollment
overridePrerequisite(studentId: string, courseId: string, approvedBy: string)
```

### 3. Prerequisite Checking
```typescript
interface PrerequisiteResult {
  met: boolean;
  prerequisites: {
    courseId: string;
    courseName: string;
    required: boolean;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_TAKEN';
    grade?: string;
  }[];
  unmetPrerequisites: string[];  // Course IDs not met
}

// A prerequisite is met if:
// 1. Student completed the course with grade >= D (or configured minimum)
// 2. Student has an approved prerequisite override
```

### 4. Hold System
```typescript
enum HoldType {
  FINANCIAL = 'FINANCIAL',      // Unpaid fees
  ACADEMIC = 'ACADEMIC',        // Academic probation
  LIBRARY = 'LIBRARY',          // Unreturned books
  DISCIPLINARY = 'DISCIPLINARY',
  ADMINISTRATIVE = 'ADMINISTRATIVE'
}

interface Hold {
  id: string;
  studentId: string;
  type: HoldType;
  reason: string;
  placedBy: string;
  placedAt: DateTime;
  releasedAt?: DateTime;
  releasedBy?: string;
  blocksRegistration: boolean;
  blocksGrades: boolean;
  blocksTranscript: boolean;
}

placeHold(data: CreateHoldDto)
releaseHold(holdId: string, releasedBy: string)
getStudentHolds(studentId: string)
checkHolds(studentId: string, action: 'REGISTRATION' | 'GRADES' | 'TRANSCRIPT'): Hold[]
```

### 5. API Routes

**Registration Periods:**
```
GET    /api/v1/registration-periods?semesterId=
POST   /api/v1/registration-periods
GET    /api/v1/registration-periods/:id
PATCH  /api/v1/registration-periods/:id
DELETE /api/v1/registration-periods/:id
GET    /api/v1/registration-periods/current
```

**Enrollments:**
```
POST   /api/v1/enrollments                    # Register for class
DELETE /api/v1/enrollments/:id                # Drop class
GET    /api/v1/enrollments/student/:studentId
GET    /api/v1/enrollments/class/:classId
POST   /api/v1/enrollments/bulk-register
POST   /api/v1/enrollments/bulk-drop
POST   /api/v1/enrollments/force-enroll       # Admin only
```

**Prerequisites:**
```
GET    /api/v1/prerequisites/check?studentId=&courseId=
POST   /api/v1/prerequisites/override         # Admin only
GET    /api/v1/prerequisites/overrides/:studentId
```

**Holds:**
```
GET    /api/v1/holds/student/:studentId
POST   /api/v1/holds
DELETE /api/v1/holds/:id                      # Release hold
GET    /api/v1/holds/check/:studentId?action=REGISTRATION
```

**Student Registration (Student Portal):**
```
GET    /api/v1/student/registration/available-classes
GET    /api/v1/student/registration/status
POST   /api/v1/student/registration/register
POST   /api/v1/student/registration/drop
GET    /api/v1/student/registration/schedule-preview
GET    /api/v1/student/registration/holds
```

---

## Frontend Implementation

### 1. Admin - Registration Management (src/pages/admin/registration/)

**RegistrationPeriodsPage.tsx:**
- Manage registration periods per semester
- Set dates, late fees
- Open/close registration

**EnrollmentManagementPage.tsx:**
- Search student
- View/modify enrollments
- Force enroll with reason
- Override prerequisites

**HoldsManagementPage.tsx:**
- List all active holds
- Place new hold
- Release holds
- Filter by type, student

### 2. Student - Registration (src/pages/student/registration/)

**CourseRegistrationPage.tsx:**
Main registration interface:
```
┌─────────────────────────────────────────────────────────────┐
│ Course Registration - Fall 2025                             │
│ Registration closes: March 15, 2025                         │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ You have 1 hold preventing registration                  │
│    [View Holds]                                             │
├─────────────────────────────────────────────────────────────┤
│ Search Courses: [________________________] [🔍]             │
│ Filter: [All Departments ▼] [All Days ▼] [All Times ▼]     │
├─────────────────────────────────────────────────────────────┤
│ Available Courses                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CS201 - Data Structures                    3 Credits    │ │
│ │ Prerequisites: CS101 ✓                                  │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │ Section A │ Dr. Ahmed │ Mon/Wed 10:00 │ 35/40 [+] │   │ │
│ │ │ Section B │ Dr. Fatima│ Tue/Thu 14:00 │ 40/40 FULL│   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CS301 - Algorithms                         4 Credits    │ │
│ │ Prerequisites: CS201 ❌ (Not completed)                 │ │
│ │ [Cannot register - prerequisite not met]                │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Your Schedule (15 credits)                    [View Weekly] │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CS101-A │ Intro to CS │ Mon/Wed 08:00 │ 3cr │ [Drop]   │ │
│ │ MA101-B │ Calculus I  │ Tue/Thu 10:00 │ 4cr │ [Drop]   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**SchedulePreviewPage.tsx:**
- Weekly calendar showing selected classes
- Highlight conflicts
- Show before confirming registration

**RegistrationHoldsPage.tsx:**
- List student's active holds
- Instructions to resolve each
- Contact information

### 3. UI Components

**CourseSearchCard.tsx:**
```tsx
interface Props {
  course: Course;
  classes: Class[];
  prerequisiteStatus: PrerequisiteResult;
  onRegister: (classId: string) => void;
}
```

**ClassSlotRow.tsx:**
- Section name, lecturer, schedule
- Capacity indicator
- Register/Full button
- Conflict warning if applicable

**PrerequisiteIndicator.tsx:**
```tsx
// Shows: ✓ Met, ❌ Not met, 🔄 In progress
<PrerequisiteIndicator status="MET" courseName="CS101" />
```

**RegistrationCart.tsx:**
- Shopping cart style
- Add/remove classes
- Show total credits
- Validate before submit

**HoldAlert.tsx:**
```tsx
<HoldAlert 
  hold={hold}
  showResolveInstructions={true}
/>
```

**CreditCounter.tsx:**
```tsx
// Shows: "15 / 18 credits" with progress bar
<CreditCounter current={15} min={12} max={18} />
```

---

## Business Rules

### Registration Rules
1. Registration only during open period
2. Cannot register if blocking holds exist
3. Prerequisites must be met (or overridden)
4. Cannot exceed max credits (configurable, default 21)
5. Cannot go below min credits without approval
6. Class must have available capacity
7. No schedule conflicts allowed

### Drop Rules
1. Drop allowed during registration period
2. Drop during "drop/add" period
3. After deadline: requires admin approval
4. Dropped after deadline may show "W" on transcript

### Hold Rules
1. Financial hold: placed when balance > threshold
2. Library hold: placed when overdue books
3. Auto-release financial hold when paid
4. Admin can manually release any hold

---

## Database Updates

```prisma
model RegistrationPeriod {
  id          String    @id @default(uuid())
  semesterId  String
  semester    Semester  @relation(fields: [semesterId], references: [id])
  type        RegistrationPeriodType
  startDate   DateTime
  endDate     DateTime
  lateFee     Decimal?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Hold {
  id                  String    @id @default(uuid())
  studentId           String
  student             Student   @relation(fields: [studentId], references: [id])
  type                HoldType
  reason              String
  placedById          String
  placedBy            User      @relation("HoldPlacer", fields: [placedById], references: [id])
  placedAt            DateTime  @default(now())
  releasedAt          DateTime?
  releasedById        String?
  releasedBy          User?     @relation("HoldReleaser", fields: [releasedById], references: [id])
  blocksRegistration  Boolean   @default(true)
  blocksGrades        Boolean   @default(false)
  blocksTranscript    Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

model PrerequisiteOverride {
  id          String   @id @default(uuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  approvedById String
  approvedBy  User     @relation(fields: [approvedById], references: [id])
  reason      String
  createdAt   DateTime @default(now())
  
  @@unique([studentId, courseId])
}

enum RegistrationPeriodType {
  REGULAR
  LATE
  DROP_ADD
}

enum HoldType {
  FINANCIAL
  ACADEMIC
  LIBRARY
  DISCIPLINARY
  ADMINISTRATIVE
}
```

---

## Validation Checklist

- [ ] Registration periods can be created per semester
- [ ] Students can only register during open periods
- [ ] Prerequisites are checked before registration
- [ ] Unmet prerequisites show clear message
- [ ] Admin can override prerequisites
- [ ] Holds block registration appropriately
- [ ] Financial holds auto-placed for unpaid fees
- [ ] Capacity prevents over-enrollment
- [ ] Schedule conflicts detected and shown
- [ ] Drop works during allowed period
- [ ] Credit limits enforced (min/max)
- [ ] Weekly schedule preview shows conflicts
- [ ] Registration cart allows batch registration
- [ ] Audit log captures all registration actions
