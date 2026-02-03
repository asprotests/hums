# Prompt 14: Grading & Examination System

## Objective
Implement complete grading system with exam management, grade entry, GPA calculation, and transcript generation.

## Location in Project
Place this file in: `hums-v2-project/prompts/14-grading-exams.md`

---

## Backend Implementation

### 1. Grade Configuration Service (src/services/gradeConfig.service.ts)
```typescript
interface GradeScale {
  id: string;
  name: string;           // e.g., "Standard", "Pass/Fail"
  isDefault: boolean;
  grades: GradeDefinition[];
}

interface GradeDefinition {
  letter: string;         // A+, A, A-, B+, etc.
  minPercentage: number;  // 90 for A
  maxPercentage: number;  // 100 for A
  gradePoints: number;    // 4.0 for A
  description: string;    // "Excellent"
}

// Default Somali University Scale
const defaultScale: GradeDefinition[] = [
  { letter: 'A+', minPercentage: 95, maxPercentage: 100, gradePoints: 4.0, description: 'Exceptional' },
  { letter: 'A',  minPercentage: 90, maxPercentage: 94,  gradePoints: 4.0, description: 'Excellent' },
  { letter: 'A-', minPercentage: 87, maxPercentage: 89,  gradePoints: 3.7, description: 'Very Good' },
  { letter: 'B+', minPercentage: 83, maxPercentage: 86,  gradePoints: 3.3, description: 'Good' },
  { letter: 'B',  minPercentage: 80, maxPercentage: 82,  gradePoints: 3.0, description: 'Above Average' },
  { letter: 'B-', minPercentage: 77, maxPercentage: 79,  gradePoints: 2.7, description: 'Average' },
  { letter: 'C+', minPercentage: 73, maxPercentage: 76,  gradePoints: 2.3, description: 'Below Average' },
  { letter: 'C',  minPercentage: 70, maxPercentage: 72,  gradePoints: 2.0, description: 'Satisfactory' },
  { letter: 'C-', minPercentage: 67, maxPercentage: 69,  gradePoints: 1.7, description: 'Pass' },
  { letter: 'D+', minPercentage: 63, maxPercentage: 66,  gradePoints: 1.3, description: 'Marginal Pass' },
  { letter: 'D',  minPercentage: 60, maxPercentage: 62,  gradePoints: 1.0, description: 'Minimum Pass' },
  { letter: 'F',  minPercentage: 0,  maxPercentage: 59,  gradePoints: 0.0, description: 'Fail' }
];

getGradeScales(): GradeScale[]
getGradeScale(id: string): GradeScale
createGradeScale(data: CreateGradeScaleDto): GradeScale
updateGradeScale(id: string, data: UpdateGradeScaleDto): GradeScale
setDefaultScale(id: string): void
calculateLetterGrade(percentage: number, scaleId?: string): string
```

### 2. Grade Component Service (src/services/gradeComponent.service.ts)
```typescript
// Define how grades are weighted for a class
interface GradeComponent {
  id: string;
  classId: string;
  name: string;           // "Midterm", "Final", "Assignments"
  type: GradeComponentType;
  weight: number;         // Percentage, e.g., 30
  maxScore: number;       // e.g., 100
  dueDate?: DateTime;
  isPublished: boolean;
}

enum GradeComponentType {
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  PROJECT = 'PROJECT',
  PARTICIPATION = 'PARTICIPATION',
  LAB = 'LAB'
}

// Example class setup:
// Midterm: 25%
// Final: 35%
// Assignments: 20%
// Quizzes: 10%
// Participation: 10%
// Total: 100%

createComponent(classId: string, data: CreateComponentDto): GradeComponent
getClassComponents(classId: string): GradeComponent[]
updateComponent(id: string, data: UpdateComponentDto): GradeComponent
deleteComponent(id: string): void
validateWeights(classId: string): { valid: boolean; total: number }
copyComponentsFromClass(sourceClassId: string, targetClassId: string): void
```

### 3. Grade Entry Service (src/services/gradeEntry.service.ts)
```typescript
interface GradeEntry {
  id: string;
  componentId: string;
  enrollmentId: string;
  score: number;
  remarks?: string;
  enteredById: string;
  enteredAt: DateTime;
  modifiedById?: string;
  modifiedAt?: DateTime;
}

// Grade entry
enterGrades(componentId: string, grades: { enrollmentId: string; score: number; remarks?: string }[]): GradeEntry[]
updateGrade(entryId: string, score: number, remarks?: string): GradeEntry
deleteGrade(entryId: string): void

// Retrieval
getComponentGrades(componentId: string): GradeEntry[]
getStudentGrades(enrollmentId: string): GradeEntry[]

// Publishing
publishComponent(componentId: string): void
unpublishComponent(componentId: string): void

// Finalization
finalizeClassGrades(classId: string): void
unfinalizeClassGrades(classId: string): void  // Admin only, with reason
```

### 4. Grade Calculation Service (src/services/gradeCalculation.service.ts)
```typescript
interface CalculatedGrade {
  enrollmentId: string;
  componentScores: { componentId: string; score: number; weight: number; weightedScore: number }[];
  totalPercentage: number;
  letterGrade: string;
  gradePoints: number;
}

interface GPAResult {
  semesterGPA: number;
  cumulativeGPA: number;
  totalCredits: number;
  totalPoints: number;
  semesterCredits: number;
  semesterPoints: number;
}

// Calculate final grade for enrollment
calculateFinalGrade(enrollmentId: string): CalculatedGrade
calculateClassGrades(classId: string): CalculatedGrade[]

// GPA calculations
calculateSemesterGPA(studentId: string, semesterId: string): number
calculateCGPA(studentId: string): number
getGPADetails(studentId: string): GPAResult

// Transcript
generateTranscript(studentId: string, official: boolean): TranscriptData
```

### 5. Exam Service (src/services/exam.service.ts)
```typescript
interface Exam {
  id: string;
  classId: string;
  type: ExamType;
  title: string;
  date: DateTime;
  startTime: string;
  endTime: string;
  duration: number;       // minutes
  roomId: string;
  maxScore: number;
  instructions?: string;
  status: ExamStatus;
}

enum ExamType {
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  QUIZ = 'QUIZ',
  MAKEUP = 'MAKEUP'
}

enum ExamStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Exam management
scheduleExam(data: CreateExamDto): Exam
updateExam(id: string, data: UpdateExamDto): Exam
cancelExam(id: string, reason: string): void
getExams(filters: { classId?, semesterId?, type?, dateRange? }): Exam[]

// Exam scheduling helpers
checkRoomAvailability(roomId: string, date: Date, startTime: string, endTime: string): boolean
checkConflicts(classId: string, date: Date, startTime: string): Conflict[]
generateExamSchedule(semesterId: string): ExamSchedule[]  // Auto-generate final exam schedule
```

### 6. API Routes

**Grade Configuration:**
```
GET    /api/v1/grade-scales
POST   /api/v1/grade-scales
GET    /api/v1/grade-scales/:id
PATCH  /api/v1/grade-scales/:id
PATCH  /api/v1/grade-scales/:id/set-default
```

**Grade Components:**
```
GET    /api/v1/classes/:classId/components
POST   /api/v1/classes/:classId/components
GET    /api/v1/grade-components/:id
PATCH  /api/v1/grade-components/:id
DELETE /api/v1/grade-components/:id
POST   /api/v1/grade-components/copy
GET    /api/v1/classes/:classId/components/validate-weights
```

**Grade Entry:**
```
POST   /api/v1/grade-components/:id/grades        # Enter grades
GET    /api/v1/grade-components/:id/grades        # Get all grades
PATCH  /api/v1/grade-entries/:id                  # Update single grade
DELETE /api/v1/grade-entries/:id
POST   /api/v1/grade-components/:id/publish
POST   /api/v1/grade-components/:id/unpublish
POST   /api/v1/classes/:classId/grades/finalize
POST   /api/v1/classes/:classId/grades/unfinalize  # Admin
```

**Grade Calculation:**
```
GET    /api/v1/classes/:classId/grades/calculated
GET    /api/v1/enrollments/:id/grades
GET    /api/v1/students/:id/gpa
GET    /api/v1/students/:id/transcript?official=false
```

**Exams:**
```
GET    /api/v1/exams
POST   /api/v1/exams
GET    /api/v1/exams/:id
PATCH  /api/v1/exams/:id
DELETE /api/v1/exams/:id
POST   /api/v1/exams/:id/cancel
GET    /api/v1/exams/class/:classId
GET    /api/v1/exams/schedule?semesterId=
POST   /api/v1/exams/generate-schedule
```

**Student Portal:**
```
GET    /api/v1/student/grades                      # Current semester
GET    /api/v1/student/grades/history              # All semesters
GET    /api/v1/student/grades/gpa
GET    /api/v1/student/transcript
GET    /api/v1/student/exams                       # Upcoming exams
```

---

## Frontend Implementation

### 1. Lecturer - Grade Management (src/pages/academic/grades/)

**GradeSetupPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Grade Setup - CS101-A                                       │
├─────────────────────────────────────────────────────────────┤
│ Grade Components                              [+ Add]       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Component    │ Type       │ Weight │ Max Score │ Action│ │
│ ├──────────────┼────────────┼────────┼───────────┼───────┤ │
│ │ Midterm Exam │ MIDTERM    │ 25%    │ 100       │ [✏️][🗑]│ │
│ │ Final Exam   │ FINAL      │ 35%    │ 100       │ [✏️][🗑]│ │
│ │ Assignments  │ ASSIGNMENT │ 20%    │ 100       │ [✏️][🗑]│ │
│ │ Quizzes      │ QUIZ       │ 10%    │ 50        │ [✏️][🗑]│ │
│ │ Participation│ OTHER      │ 10%    │ 100       │ [✏️][🗑]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Total Weight: 100% ✓                                        │
│                                                             │
│ [Copy from Another Class]                    [Save Setup]   │
└─────────────────────────────────────────────────────────────┘
```

**GradeEntryPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Enter Grades - CS101-A - Midterm Exam                       │
├─────────────────────────────────────────────────────────────┤
│ Max Score: 100    Weight: 25%    Status: Draft              │
├─────────────────────────────────────────────────────────────┤
│ Quick Entry: [Import from Excel]                            │
├─────────────────────────────────────────────────────────────┤
│ #  │ Student ID  │ Name           │ Score │ Letter │ Notes │
│────┼─────────────┼────────────────┼───────┼────────┼───────│
│ 1  │ HU/2025/001│ Ahmed Mohamed  │ [85 ] │   B+   │ [   ] │
│ 2  │ HU/2025/002│ Fatima Ali     │ [92 ] │   A    │ [   ] │
│ 3  │ HU/2025/003│ Hassan Omar    │ [78 ] │   C+   │ [   ] │
│ 4  │ HU/2025/004│ Amina Yusuf    │ [   ] │   --   │ [   ] │
│ ...│            │                │       │        │       │
├─────────────────────────────────────────────────────────────┤
│ Entered: 35/40    Average: 81.2    Highest: 98   Lowest: 45│
├─────────────────────────────────────────────────────────────┤
│ [Save Draft]            [Preview Results]    [Publish]     │
└─────────────────────────────────────────────────────────────┘
```

**ClassGradebookPage.tsx:**
Full gradebook view showing all components and final grades:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Gradebook - CS101-A                                    [Export] [Print] │
├─────────────────────────────────────────────────────────────────────────┤
│           │ Midterm │ Final │ Assign │ Quiz │ Part. │ Total │ Grade   │
│           │  (25%)  │ (35%) │ (20%)  │(10%) │ (10%) │       │         │
│───────────┼─────────┼───────┼────────┼──────┼───────┼───────┼─────────│
│ Ahmed M.  │   85    │  88   │   90   │  45  │  95   │ 87.3  │   B+    │
│ Fatima A. │   92    │  95   │   88   │  48  │  90   │ 92.1  │   A     │
│ Hassan O. │   78    │  72   │   85   │  40  │  80   │ 77.2  │   C+    │
│───────────┼─────────┼───────┼────────┼──────┼───────┼───────┼─────────│
│ Average   │  82.5   │ 81.0  │  86.2  │ 43.5 │ 87.0  │ 83.1  │         │
└─────────────────────────────────────────────────────────────────────────┘
│                                              [Save] [Finalize Grades]   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Student - Grades View (src/pages/student/grades/)

**MyGradesPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Grades - Fall 2025                                       │
├─────────────────────────────────────────────────────────────┤
│ Semester GPA: 3.45        CGPA: 3.52                       │
├─────────────────────────────────────────────────────────────┤
│ CS101 - Introduction to Computer Science                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Midterm (25%)      │ 85/100  │ ████████░░ │ B+         │ │
│ │ Final (35%)        │ --/100  │ Not graded │            │ │
│ │ Assignments (20%)  │ 90/100  │ █████████░ │ A          │ │
│ │ Quizzes (10%)      │ 45/50   │ █████████░ │ A          │ │
│ │ Participation (10%)│ 95/100  │ █████████░ │ A          │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Current: 87.3% (B+)         Projected Final: B+ to A-  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ MA101 - Calculus I                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [View Transcript]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 3. Transcript Generation

**TranscriptPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│                   HORMUUD UNIVERSITY                        │
│                  ACADEMIC TRANSCRIPT                        │
│                      (Unofficial)                           │
├─────────────────────────────────────────────────────────────┤
│ Name: Ahmed Mohamed Ali                                     │
│ Student ID: HU/2025/0001                                   │
│ Program: Bachelor of Science in Computer Science            │
│ Admission Date: September 2025                              │
│ Print Date: February 15, 2026                              │
├─────────────────────────────────────────────────────────────┤
│ FALL 2025                                                   │
│ ┌─────────┬─────────────────────┬─────┬───────┬──────────┐ │
│ │ Code    │ Course Name         │ Cr  │ Grade │ Points   │ │
│ ├─────────┼─────────────────────┼─────┼───────┼──────────┤ │
│ │ CS101   │ Intro to Comp Sci   │  3  │   A   │  12.00   │ │
│ │ MA101   │ Calculus I          │  4  │   B+  │  13.20   │ │
│ │ EN101   │ English Composition │  3  │   A-  │  11.10   │ │
│ │ PH101   │ Physics I           │  4  │   B   │  12.00   │ │
│ └─────────┴─────────────────────┴─────┴───────┴──────────┘ │
│ Semester Credits: 14    Semester GPA: 3.45                 │
├─────────────────────────────────────────────────────────────┤
│ CUMULATIVE                                                  │
│ Total Credits Earned: 14                                    │
│ Cumulative GPA: 3.45                                       │
├─────────────────────────────────────────────────────────────┤
│ GRADING SCALE                                               │
│ A (90-100) = 4.0    B (80-89) = 3.0    C (70-79) = 2.0    │
│ D (60-69) = 1.0     F (0-59) = 0.0                         │
└─────────────────────────────────────────────────────────────┘
```

### 4. Exam Management (src/pages/academic/exams/)

**ExamSchedulePage.tsx:**
- List all scheduled exams
- Filter by semester, type
- Calendar view option

**ExamFormPage.tsx:**
- Schedule new exam
- Select class, date, time, room
- Conflict checking

**StudentExamsPage.tsx:**
- Student view of upcoming exams
- Room and time details
- Countdown to exam

### 5. UI Components

**GradeEntryInput.tsx:**
```tsx
<GradeEntryInput
  maxScore={100}
  value={85}
  onChange={(score) => updateScore(score)}
  showLetterGrade={true}
/>
```

**GradeBadge.tsx:**
```tsx
<GradeBadge letter="A" points={4.0} />
// Shows colored badge with letter
```

**GPADisplay.tsx:**
```tsx
<GPADisplay 
  semesterGPA={3.45} 
  cumulativeGPA={3.52}
  showTrend={true}
/>
```

**GradeProgressBar.tsx:**
```tsx
<GradeProgressBar score={85} maxScore={100} />
```

---

## Database Updates

```prisma
model GradeScale {
  id          String            @id @default(uuid())
  name        String
  isDefault   Boolean           @default(false)
  grades      GradeDefinition[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model GradeDefinition {
  id            String     @id @default(uuid())
  scaleId       String
  scale         GradeScale @relation(fields: [scaleId], references: [id])
  letter        String
  minPercentage Decimal
  maxPercentage Decimal
  gradePoints   Decimal
  description   String?
  
  @@index([scaleId])
}

model GradeComponent {
  id          String              @id @default(uuid())
  classId     String
  class       Class               @relation(fields: [classId], references: [id])
  name        String
  type        GradeComponentType
  weight      Decimal
  maxScore    Decimal
  dueDate     DateTime?
  isPublished Boolean             @default(false)
  entries     GradeEntry[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model GradeEntry {
  id            String         @id @default(uuid())
  componentId   String
  component     GradeComponent @relation(fields: [componentId], references: [id])
  enrollmentId  String
  enrollment    Enrollment     @relation(fields: [enrollmentId], references: [id])
  score         Decimal
  remarks       String?
  enteredById   String
  enteredBy     User           @relation("GradeEnteredBy", fields: [enteredById], references: [id])
  enteredAt     DateTime       @default(now())
  modifiedById  String?
  modifiedBy    User?          @relation("GradeModifiedBy", fields: [modifiedById], references: [id])
  modifiedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@unique([componentId, enrollmentId])
}

model Exam {
  id           String     @id @default(uuid())
  classId      String
  class        Class      @relation(fields: [classId], references: [id])
  type         ExamType
  title        String
  date         DateTime   @db.Date
  startTime    String
  endTime      String
  duration     Int
  roomId       String
  room         Room       @relation(fields: [roomId], references: [id])
  maxScore     Decimal
  instructions String?
  status       ExamStatus @default(SCHEDULED)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

// Add to Enrollment model
model Enrollment {
  // ... existing fields
  finalPercentage Decimal?
  finalGrade      String?
  gradePoints     Decimal?
  isFinalized     Boolean   @default(false)
  finalizedAt     DateTime?
  finalizedById   String?
}

enum GradeComponentType {
  MIDTERM
  FINAL
  QUIZ
  ASSIGNMENT
  PROJECT
  PARTICIPATION
  LAB
  OTHER
}

enum ExamType {
  MIDTERM
  FINAL
  QUIZ
  MAKEUP
}

enum ExamStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## Validation Checklist

- [ ] Grade scale can be configured
- [ ] Grade components can be set per class
- [ ] Component weights must total 100%
- [ ] Grades can be entered for each component
- [ ] Letter grade auto-calculates from score
- [ ] Final grade calculates from weighted components
- [ ] Grades can be published to students
- [ ] Students only see published grades
- [ ] Grades can be finalized (locked)
- [ ] Finalized grades cannot be changed without admin
- [ ] Semester GPA calculates correctly
- [ ] CGPA calculates across all semesters
- [ ] Transcript generates with all grades
- [ ] Transcript PDF can be downloaded
- [ ] Exams can be scheduled
- [ ] Exam conflicts are detected
- [ ] Students can view exam schedule
- [ ] Gradebook exports to Excel
