# Prompt 08: Student Portal

## Objective
Build the complete student-facing portal with all Phase 1 features.

## Backend - Student-Specific Endpoints

### 1. Student Profile Routes
```
GET    /api/v1/student/profile          # Get own profile
PATCH  /api/v1/student/profile          # Update contact info only
POST   /api/v1/student/profile/photo    # Upload profile photo
GET    /api/v1/student/program          # Get enrolled program
```

### 2. Academic Records Routes
```
GET    /api/v1/student/enrollments              # Current semester enrollments
GET    /api/v1/student/enrollments/history      # All enrollments
GET    /api/v1/student/grades                   # Current semester grades
GET    /api/v1/student/grades/history           # Complete grade history
GET    /api/v1/student/grades/gpa               # GPA/CGPA calculation
GET    /api/v1/student/transcript               # Generate unofficial transcript
GET    /api/v1/student/attendance               # Attendance records
GET    /api/v1/student/schedule                 # Weekly class schedule
GET    /api/v1/student/exams                    # Exam schedule
```

### 3. Finance Routes
```
GET    /api/v1/student/fees                     # Fee structure for program
GET    /api/v1/student/balance                  # Current balance
GET    /api/v1/student/invoices                 # All invoices
GET    /api/v1/student/payments                 # Payment history
GET    /api/v1/student/payments/:id/receipt     # Download receipt
```

### 4. Communication Routes
```
GET    /api/v1/student/announcements            # Relevant announcements
GET    /api/v1/student/notifications            # Personal notifications
PATCH  /api/v1/student/notifications/:id/read   # Mark as read
GET    /api/v1/student/courses/:id/materials    # Course materials
```

### 5. Authorization Middleware
Create middleware that ensures students can only access their own data:
```typescript
// Automatically injects studentId from authenticated user
const studentOnly = (req, res, next) => {
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Student access only' });
  }
  req.studentId = req.user.student.id;
  next();
};
```

## Frontend Implementation

### 1. Student Portal Layout (src/layouts/StudentLayout.tsx)
```
┌─────────────────────────────────────────────────┐
│  [Logo]  HUMS Student Portal    [🔔] [Profile] │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Dashboard│         Main Content Area            │
│ Profile  │                                      │
│ Schedule │                                      │
│ Grades   │                                      │
│ Attendance│                                     │
│ Finance  │                                      │
│ Library  │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  © 2025 Hormuud University                      │
└─────────────────────────────────────────────────┘
```

### 2. Student Pages (src/pages/student/)

**Dashboard (StudentDashboardPage.tsx):**
- Welcome message with student name
- Current semester info
- Quick stats cards:
  - Enrolled courses count
  - Current GPA
  - Attendance percentage
  - Outstanding balance
- Upcoming classes (today)
- Recent announcements
- Due assignments (future)

**Profile (StudentProfilePage.tsx):**
- View all profile information
- Edit contact info (phone, email, address)
- Upload/change profile photo
- View program details
- View student ID

**Schedule (StudentSchedulePage.tsx):**
- Weekly calendar view
- List view option
- Filter by day
- Show room and lecturer info

**Grades (StudentGradesPage.tsx):**
- Current semester grades
- Historical grades by semester
- GPA/CGPA display
- Grade breakdown per course
- Download transcript button

**Attendance (StudentAttendancePage.tsx):**
- Attendance by course
- Percentage per course
- Warning if below threshold (75%)
- Calendar view of attendance

**Finance (StudentFinancePage.tsx):**
- Fee structure display
- Current balance (prominent)
- Invoice list with status
- Payment history
- Download receipts

**Announcements (StudentAnnouncementsPage.tsx):**
- List of announcements
- Filter by type (Academic, Finance, General)
- Mark as read

### 3. UI Components for Student Portal

**StudentInfoCard:**
```tsx
<StudentInfoCard>
  <Avatar src={student.photo} />
  <Name>{student.fullName}</Name>
  <StudentId>{student.studentId}</StudentId>
  <Program>{student.program.name}</Program>
  <Status>{student.status}</Status>
</StudentInfoCard>
```

**StatCard:**
```tsx
<StatCard
  title="Current GPA"
  value="3.45"
  icon={<GraduationCap />}
  trend="+0.15"
/>
```

**ScheduleCalendar:**
- Week view with time slots
- Color-coded by course
- Click to see details

**GradeTable:**
```
| Course | Credits | Midterm | Final | Total | Grade |
|--------|---------|---------|-------|-------|-------|
| CS101  | 3       | 85/100  | 78/100| 81.5  | B+    |
```

**AttendanceChart:**
- Circular progress per course
- Color: Green (>80%), Yellow (75-80%), Red (<75%)

**BalanceCard:**
```tsx
<BalanceCard>
  <Label>Outstanding Balance</Label>
  <Amount negative={balance > 0}>${balance}</Amount>
  <DueDate>Due: March 15, 2025</DueDate>
</BalanceCard>
```

### 4. Student Dashboard Widgets

**TodayScheduleWidget:**
- Shows today's classes
- Time, Course, Room, Lecturer
- "No classes today" if empty

**AnnouncementsWidget:**
- 3 most recent announcements
- "View All" link

**QuickActionsWidget:**
- View Grades
- View Schedule
- View Balance
- Download Transcript

### 5. Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile
- Bottom navigation on mobile
- Cards stack vertically on mobile

### 6. Internationalization
All student portal text must support:
- English (default)
- Somali

Key translations needed:
- Navigation items
- Labels and headings
- Status messages
- Error messages

## GPA Calculation Logic

```typescript
// Grade points mapping
const gradePoints = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

// Semester GPA
function calculateGPA(enrollments: Enrollment[]): number {
  let totalPoints = 0;
  let totalCredits = 0;
  
  for (const enrollment of enrollments) {
    if (enrollment.finalGrade) {
      const credits = enrollment.course.credits;
      const points = gradePoints[enrollment.finalGrade] * credits;
      totalPoints += points;
      totalCredits += credits;
    }
  }
  
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// CGPA = GPA across all semesters
```

## Transcript Format (PDF)

```
┌─────────────────────────────────────────────────┐
│           HORMUUD UNIVERSITY                    │
│           UNOFFICIAL TRANSCRIPT                 │
├─────────────────────────────────────────────────┤
│ Student: Ahmed Mohamed Ali                      │
│ Student ID: HU/2025/0001                       │
│ Program: Bachelor of Science in Computer Science│
│ Date Issued: February 15, 2025                 │
├─────────────────────────────────────────────────┤
│ FALL 2025                                       │
│ ┌─────────┬────────┬───────┬───────┬─────────┐ │
│ │ Code    │ Course │Credits│ Grade │ Points  │ │
│ ├─────────┼────────┼───────┼───────┼─────────┤ │
│ │ CS101   │ Intro..│   3   │   A   │  12.0   │ │
│ │ CS102   │ Data...│   3   │   B+  │   9.9   │ │
│ └─────────┴────────┴───────┴───────┴─────────┘ │
│ Semester GPA: 3.65    Credits: 6               │
├─────────────────────────────────────────────────┤
│ CUMULATIVE GPA: 3.65                           │
│ TOTAL CREDITS EARNED: 6                        │
├─────────────────────────────────────────────────┤
│ * This is an unofficial transcript             │
└─────────────────────────────────────────────────┘
```

## Validation Checklist
- [ ] Student can login and see dashboard
- [ ] Profile displays correctly
- [ ] Can update contact information
- [ ] Schedule shows enrolled classes
- [ ] Grades display with GPA calculation
- [ ] Attendance shows percentages
- [ ] Finance shows balance and payments
- [ ] Can download payment receipts
- [ ] Can download unofficial transcript
- [ ] Announcements display correctly
- [ ] Works on mobile devices
- [ ] Language switcher works (en/so)
