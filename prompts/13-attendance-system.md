# Prompt 13: Attendance System

## Objective
Implement comprehensive attendance tracking for students and employees with multiple marking methods.

## Location in Project
Place this file in: `hums-v2-project/prompts/13-attendance-system.md`

---

## Backend Implementation

### 1. Student Attendance Service (src/services/studentAttendance.service.ts)
```typescript
enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  markedById: string;
  markedAt: DateTime;
  remarks?: string;
  excuseDocument?: string;
}

// Marking attendance
markAttendance(classId: string, date: Date, records: AttendanceInput[]): AttendanceRecord[]
markSingleAttendance(classId: string, studentId: string, date: Date, status: AttendanceStatus)
updateAttendance(recordId: string, status: AttendanceStatus, remarks?: string)

// Retrieving attendance
getClassAttendance(classId: string, date: Date): AttendanceRecord[]
getClassAttendanceByDateRange(classId: string, startDate: Date, endDate: Date)
getStudentAttendance(studentId: string, classId?: string, semesterId?: string)
getStudentAttendanceSummary(studentId: string, semesterId: string): AttendanceSummary

// Analytics
calculateAttendancePercentage(studentId: string, classId: string): number
getStudentsBelowThreshold(classId: string, threshold: number): Student[]
getClassAttendanceReport(classId: string): ClassAttendanceReport
generateAttendanceSheet(classId: string, date: Date): PDF

// Excuse management
submitExcuse(studentId: string, classId: string, date: Date, reason: string, document?: File)
approveExcuse(excuseId: string, approvedById: string)
rejectExcuse(excuseId: string, reason: string)
```

### 2. QR Code Attendance (Optional Enhancement)
```typescript
// Generate unique QR for class session
generateSessionQR(classId: string, date: Date, validMinutes: number): QRSession

interface QRSession {
  id: string;
  classId: string;
  date: Date;
  qrCode: string;        // Encoded data
  expiresAt: DateTime;
  location?: {           // Optional geofencing
    lat: number;
    lng: number;
    radiusMeters: number;
  }
}

// Student scans QR
checkInWithQR(sessionId: string, studentId: string, location?: GeoLocation): AttendanceRecord
```

### 3. Employee Attendance Service (src/services/employeeAttendance.service.ts)
```typescript
interface EmployeeAttendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn?: DateTime;
  checkOut?: DateTime;
  status: EmployeeAttendanceStatus;
  workHours?: number;
  remarks?: string;
}

enum EmployeeAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
  HOLIDAY = 'HOLIDAY'
}

// Check in/out
checkIn(employeeId: string): EmployeeAttendance
checkOut(employeeId: string): EmployeeAttendance
manualEntry(employeeId: string, date: Date, checkIn: DateTime, checkOut: DateTime)

// Retrieval
getEmployeeAttendance(employeeId: string, month: number, year: number)
getDailyAttendance(date: Date, departmentId?: string)
getAttendanceSummary(employeeId: string, month: number, year: number): MonthlySummary

// Reports
generateMonthlyReport(departmentId: string, month: number, year: number)
getLateArrivals(date: Date, graceMinutes: number)
getAbsentees(date: Date, departmentId?: string)
```

### 4. Attendance Configuration
```typescript
interface AttendanceConfig {
  minAttendancePercentage: number;      // Default 75%
  lateThresholdMinutes: number;         // Minutes after class start
  workStartTime: string;                // "08:00" for employees
  workEndTime: string;                  // "17:00"
  graceMinutes: number;                 // Late tolerance
  autoMarkAbsentAfterMinutes: number;   // Auto-absent if not marked
}
```

### 5. API Routes

**Student Attendance:**
```
POST   /api/v1/attendance/class/:classId/mark         # Mark for date
GET    /api/v1/attendance/class/:classId?date=        # Get by date
GET    /api/v1/attendance/class/:classId/report       # Class report
GET    /api/v1/attendance/class/:classId/below-threshold
GET    /api/v1/attendance/student/:studentId
GET    /api/v1/attendance/student/:studentId/summary?semesterId=
PATCH  /api/v1/attendance/:id                         # Update record
POST   /api/v1/attendance/excuse                      # Submit excuse
PATCH  /api/v1/attendance/excuse/:id/approve
PATCH  /api/v1/attendance/excuse/:id/reject
GET    /api/v1/attendance/sheet/:classId?date=        # Download sheet
```

**QR Attendance:**
```
POST   /api/v1/attendance/qr/generate                 # Generate QR session
POST   /api/v1/attendance/qr/check-in                 # Student check-in
GET    /api/v1/attendance/qr/session/:sessionId       # Get session status
```

**Employee Attendance:**
```
POST   /api/v1/employee-attendance/check-in
POST   /api/v1/employee-attendance/check-out
GET    /api/v1/employee-attendance/today
GET    /api/v1/employee-attendance/employee/:id?month=&year=
POST   /api/v1/employee-attendance/manual-entry
GET    /api/v1/employee-attendance/report?departmentId=&month=&year=
GET    /api/v1/employee-attendance/absentees?date=
```

**Student Portal:**
```
GET    /api/v1/student/attendance                     # Own attendance
GET    /api/v1/student/attendance/summary
POST   /api/v1/student/attendance/qr-check-in
```

---

## Frontend Implementation

### 1. Lecturer - Attendance Marking (src/pages/academic/attendance/)

**MarkAttendancePage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Mark Attendance                                             │
├─────────────────────────────────────────────────────────────┤
│ Class: CS101-A Introduction to Computer Science             │
│ Date:  [Feb 15, 2025 📅]                                   │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions: [Mark All Present] [Mark All Absent]        │
├─────────────────────────────────────────────────────────────┤
│ #  │ Student ID  │ Name            │ Status                │
│────┼─────────────┼─────────────────┼───────────────────────│
│ 1  │ HU/2025/001 │ Ahmed Mohamed   │ ◉ P ○ A ○ L ○ E      │
│ 2  │ HU/2025/002 │ Fatima Ali      │ ◉ P ○ A ○ L ○ E      │
│ 3  │ HU/2025/003 │ Hassan Omar     │ ○ P ◉ A ○ L ○ E      │
│ 4  │ HU/2025/004 │ Amina Yusuf     │ ○ P ○ A ○ L ◉ E [📎]│
│ ...│             │                 │                       │
├─────────────────────────────────────────────────────────────┤
│ Summary: 35 Present, 3 Absent, 1 Late, 1 Excused           │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel] [Save Attendance]     │
└─────────────────────────────────────────────────────────────┘

P = Present, A = Absent, L = Late, E = Excused
```

**AttendanceHistoryPage.tsx:**
- Calendar view showing attendance days
- Click date to view/edit
- Color coding: green (>80%), yellow (60-80%), red (<60%)

**ClassAttendanceReportPage.tsx:**
- Summary statistics
- Students below threshold (flagged)
- Export to PDF/Excel
- Trend chart

### 2. QR Attendance Interface

**QRGeneratorPage.tsx (Lecturer):**
```
┌─────────────────────────────────────────┐
│ Generate Attendance QR                  │
├─────────────────────────────────────────┤
│ Class: [CS101-A              ▼]         │
│ Valid for: [15 minutes       ▼]         │
│                                         │
│        ┌─────────────────┐              │
│        │  ▄▄▄▄▄ ▄▄▄▄▄   │              │
│        │  █   █ █   █   │              │
│        │  ▀▀▀▀▀ ▀▀▀▀▀   │              │
│        │   QR CODE       │              │
│        └─────────────────┘              │
│                                         │
│ Expires in: 14:32                       │
│ Checked in: 28 / 40 students            │
│                                         │
│ [Regenerate] [View Check-ins] [Close]   │
└─────────────────────────────────────────┘
```

**QRScanPage.tsx (Student - Mobile optimized):**
- Camera access for scanning
- Manual code entry option
- Confirmation on success

### 3. Student Attendance View (src/pages/student/attendance/)

**MyAttendancePage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Attendance - Fall 2025                                   │
├─────────────────────────────────────────────────────────────┤
│ Overall: 87% (Above required 75%)                          │
├─────────────────────────────────────────────────────────────┤
│ Course           │ Attended │ Total │ Percentage │ Status  │
│──────────────────┼──────────┼───────┼────────────┼─────────│
│ CS101 - Intro CS │    12    │  14   │    86%     │   ✓     │
│ MA101 - Calculus │    10    │  14   │    71%     │   ⚠️    │
│ EN101 - English  │    14    │  14   │   100%     │   ✓     │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Warning: MA101 attendance is below 75%                   │
│    2 more absences will result in course failure            │
└─────────────────────────────────────────────────────────────┘
```

### 4. HR - Employee Attendance (src/pages/hr/attendance/)

**DailyAttendancePage.tsx:**
- Today's attendance overview
- Check-in/out times
- Filter by department
- Mark manual entries

**EmployeeAttendanceReportPage.tsx:**
- Monthly calendar view
- Summary: days present, absent, leave
- Work hours tracking
- Export report

**CheckInKioskPage.tsx (Optional):**
- Simplified interface for kiosk
- Employee ID input
- Big check-in/check-out buttons

### 5. UI Components

**AttendanceStatusToggle.tsx:**
```tsx
<AttendanceStatusToggle
  value="PRESENT"
  onChange={(status) => updateStatus(status)}
  options={['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']}
/>
```

**AttendanceCalendar.tsx:**
- Month view
- Color-coded days
- Click to see details

**AttendancePercentageBadge.tsx:**
```tsx
<AttendancePercentageBadge percentage={72} threshold={75} />
// Shows: "72%" in orange with warning icon
```

**AttendanceChart.tsx:**
- Line chart showing trend
- Threshold line
- Per-course or overall

**ExcuseRequestForm.tsx:**
- Date picker
- Reason textarea
- Document upload
- Submit button

---

## Offline Support (Important for Somalia context)

### Offline Attendance Marking
```typescript
// Store attendance locally when offline
interface OfflineAttendanceQueue {
  records: AttendanceRecord[];
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

// Sync when back online
syncOfflineAttendance(): Promise<SyncResult>
```

### Implementation
1. Use IndexedDB for local storage
2. Queue attendance records when offline
3. Show "offline" indicator
4. Auto-sync when connection restored
5. Handle conflicts (server wins)

---

## Database Updates

```prisma
model StudentAttendance {
  id          String           @id @default(uuid())
  classId     String
  class       Class            @relation(fields: [classId], references: [id])
  studentId   String
  student     Student          @relation(fields: [studentId], references: [id])
  date        DateTime         @db.Date
  status      AttendanceStatus
  markedById  String
  markedBy    User             @relation(fields: [markedById], references: [id])
  markedAt    DateTime         @default(now())
  remarks     String?
  excuseId    String?
  excuse      AttendanceExcuse? @relation(fields: [excuseId], references: [id])
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  @@unique([classId, studentId, date])
  @@index([studentId])
  @@index([classId, date])
}

model AttendanceExcuse {
  id          String        @id @default(uuid())
  studentId   String
  student     Student       @relation(fields: [studentId], references: [id])
  classId     String
  class       Class         @relation(fields: [classId], references: [id])
  date        DateTime      @db.Date
  reason      String
  documentUrl String?
  status      ExcuseStatus  @default(PENDING)
  reviewedById String?
  reviewedBy  User?         @relation(fields: [reviewedById], references: [id])
  reviewedAt  DateTime?
  reviewRemarks String?
  attendance  StudentAttendance[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model QRSession {
  id          String   @id @default(uuid())
  classId     String
  class       Class    @relation(fields: [classId], references: [id])
  date        DateTime @db.Date
  code        String   @unique
  expiresAt   DateTime
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
}

model EmployeeAttendance {
  id          String                   @id @default(uuid())
  employeeId  String
  employee    Employee                 @relation(fields: [employeeId], references: [id])
  date        DateTime                 @db.Date
  checkIn     DateTime?
  checkOut    DateTime?
  status      EmployeeAttendanceStatus
  workHours   Decimal?
  remarks     String?
  createdAt   DateTime                 @default(now())
  updatedAt   DateTime                 @updatedAt
  
  @@unique([employeeId, date])
  @@index([date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}

enum ExcuseStatus {
  PENDING
  APPROVED
  REJECTED
}

enum EmployeeAttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  ON_LEAVE
  HOLIDAY
}
```

---

## Validation Checklist

- [ ] Lecturer can mark attendance for their classes
- [ ] Bulk marking (all present/absent) works
- [ ] Individual status can be changed
- [ ] Attendance history shows by date
- [ ] QR code generation works
- [ ] Student can scan QR to check in
- [ ] QR expires after set time
- [ ] Attendance percentage calculates correctly
- [ ] Students below threshold are flagged
- [ ] Warning shows on student portal
- [ ] Excuse submission works
- [ ] Excuse approval/rejection works
- [ ] Employee check-in/check-out works
- [ ] Monthly employee report generates
- [ ] Offline attendance queues correctly
- [ ] Offline data syncs when online
- [ ] Attendance can be exported to PDF/Excel
