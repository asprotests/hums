# Prompt 15: Academic Portal (Lecturer Interface)

## Objective
Build the complete lecturer-facing academic portal combining all academic features into a cohesive interface.

## Location in Project
Place this file in: `hums-v2-project/prompts/15-academic-portal.md`

---

## Overview

The Academic Portal is the primary interface for:
- **Lecturers** - Manage their classes, attendance, grades
- **Department Heads (HOD)** - Oversee department courses and faculty
- **Deans** - Faculty-wide oversight and reports

---

## Backend Implementation

### 1. Lecturer Dashboard Service (src/services/lecturerDashboard.service.ts)
```typescript
interface LecturerDashboard {
  currentSemester: Semester;
  classes: LecturerClassSummary[];
  todaySchedule: ScheduleItem[];
  pendingTasks: PendingTask[];
  recentActivity: Activity[];
  statistics: LecturerStats;
}

interface LecturerClassSummary {
  classId: string;
  courseName: string;
  className: string;
  enrolledCount: number;
  attendancePercentage: number;
  gradingProgress: number;        // % of grades entered
  nextClass: DateTime | null;
}

interface PendingTask {
  type: 'ATTENDANCE' | 'GRADING' | 'EXAM';
  classId: string;
  className: string;
  description: string;
  dueDate?: DateTime;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

getLecturerDashboard(lecturerId: string, semesterId?: string): LecturerDashboard
getLecturerClasses(lecturerId: string, semesterId?: string): Class[]
getLecturerSchedule(lecturerId: string, date?: Date): ScheduleItem[]
```

### 2. Course Materials Service (src/services/courseMaterials.service.ts)
```typescript
interface CourseMaterial {
  id: string;
  classId: string;
  title: string;
  description?: string;
  type: MaterialType;
  fileUrl?: string;
  externalUrl?: string;
  week?: number;
  orderIndex: number;
  isPublished: boolean;
  publishedAt?: DateTime;
  createdAt: DateTime;
}

enum MaterialType {
  DOCUMENT = 'DOCUMENT',      // PDF, DOC, etc.
  VIDEO = 'VIDEO',
  LINK = 'LINK',
  SLIDES = 'SLIDES',
  SYLLABUS = 'SYLLABUS'
}

uploadMaterial(classId: string, data: CreateMaterialDto, file?: File): CourseMaterial
getMaterials(classId: string, includeUnpublished?: boolean): CourseMaterial[]
updateMaterial(id: string, data: UpdateMaterialDto): CourseMaterial
deleteMaterial(id: string): void
reorderMaterials(classId: string, orderedIds: string[]): void
publishMaterial(id: string): void
unpublishMaterial(id: string): void
```

### 3. HOD Dashboard Service (src/services/hodDashboard.service.ts)
```typescript
interface HODDashboard {
  department: Department;
  currentSemester: Semester;
  facultyCount: number;
  courseCount: number;
  studentCount: number;
  classesOverview: ClassOverview[];
  facultyWorkload: FacultyWorkload[];
  attendanceAlerts: AttendanceAlert[];
  gradingProgress: DepartmentGradingProgress;
}

interface FacultyWorkload {
  lecturerId: string;
  lecturerName: string;
  classCount: number;
  totalStudents: number;
  averageAttendance: number;
  gradingProgress: number;
}

getHODDashboard(departmentId: string, semesterId?: string): HODDashboard
getDepartmentClasses(departmentId: string, semesterId: string): Class[]
getDepartmentFaculty(departmentId: string): Employee[]
assignLecturerToClass(classId: string, lecturerId: string, assignedBy: string): void
```

### 4. API Routes

**Lecturer Portal:**
```
GET    /api/v1/lecturer/dashboard
GET    /api/v1/lecturer/classes
GET    /api/v1/lecturer/classes/:id
GET    /api/v1/lecturer/schedule?date=
GET    /api/v1/lecturer/pending-tasks
```

**Course Materials:**
```
GET    /api/v1/classes/:classId/materials
POST   /api/v1/classes/:classId/materials
GET    /api/v1/materials/:id
PATCH  /api/v1/materials/:id
DELETE /api/v1/materials/:id
POST   /api/v1/materials/:id/publish
POST   /api/v1/materials/:id/unpublish
PATCH  /api/v1/classes/:classId/materials/reorder
```

**HOD Portal:**
```
GET    /api/v1/hod/dashboard
GET    /api/v1/hod/classes
GET    /api/v1/hod/faculty
GET    /api/v1/hod/faculty/:id/workload
POST   /api/v1/hod/classes/:id/assign-lecturer
GET    /api/v1/hod/reports/attendance
GET    /api/v1/hod/reports/grading-progress
```

**Dean Portal:**
```
GET    /api/v1/dean/dashboard
GET    /api/v1/dean/departments
GET    /api/v1/dean/reports/faculty-overview
GET    /api/v1/dean/reports/student-performance
```

---

## Frontend Implementation

### 1. Academic Portal Layout (src/layouts/AcademicLayout.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Academic Portal           [Semester ▼] [🔔] [👤]  │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Dashboard│              Main Content Area                   │
│ My Classes│                                                 │
│ Schedule │                                                  │
│ Attendance│                                                 │
│ Grades   │                                                  │
│ Materials│                                                  │
│ Exams    │                                                  │
│ ──────── │                                                  │
│ Reports  │  (HOD/Dean only)                                │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### 2. Lecturer Dashboard (src/pages/academic/LecturerDashboardPage.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome, Dr. Ahmed Mohamed                    Fall 2025     │
├─────────────────────────────────────────────────────────────┤
│ Today's Schedule                              Feb 15, 2025  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 08:00 │ CS101-A │ Room 101 │ Intro to CS    │ [Start]  │ │
│ │ 10:00 │ CS301-A │ Lab A    │ Algorithms     │          │ │
│ │ 14:00 │ CS201-B │ Room 205 │ Data Structures│          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ My Classes (4)                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ CS101-A      │ │ CS201-B      │ │ CS301-A      │   ...   │
│ │ 38 students  │ │ 35 students  │ │ 28 students  │         │
│ │ Att: 85%     │ │ Att: 78%     │ │ Att: 92%     │         │
│ │ Grades: 60%  │ │ Grades: 45%  │ │ Grades: 80%  │         │
│ │ [View Class] │ │ [View Class] │ │ [View Class] │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│ Pending Tasks (3)                              [View All]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ CS101-A: Mark attendance for Feb 14     [Mark Now]   │ │
│ │ 📝 CS201-B: Midterm grades due Feb 18      [Enter]      │ │
│ │ 📅 CS301-A: Final exam schedule needed     [Schedule]   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3. Class Detail Page (src/pages/academic/ClassDetailPage.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ CS101-A: Introduction to Computer Science                   │
│ Fall 2025 • 38 Students • Room 101                         │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Students] [Attendance] [Grades] [Materials]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   OVERVIEW TAB                                              │
│                                                             │
│   Schedule                                                  │
│   ┌───────────────────────────────────────────────────────┐│
│   │ Monday    │ 08:00 - 09:30 │ Room 101 │ Lecture       ││
│   │ Wednesday │ 08:00 - 09:30 │ Room 101 │ Lecture       ││
│   │ Friday    │ 10:00 - 12:00 │ Lab A    │ Lab           ││
│   └───────────────────────────────────────────────────────┘│
│                                                             │
│   Quick Stats                                               │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│   │ Attendance │ │ Avg Grade  │ │ Materials  │            │
│   │    85%     │ │   78.5%    │ │     12     │            │
│   └────────────┘ └────────────┘ └────────────┘            │
│                                                             │
│   Recent Activity                                           │
│   • Midterm grades published - 2 days ago                  │
│   • Attendance marked for Feb 14 - 1 day ago              │
│   • New material uploaded: "Week 6 Slides" - 3 days ago   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Class Students Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Students (38)                          [Export] [Email All] │
├─────────────────────────────────────────────────────────────┤
│ Search: [____________________]  Filter: [All Students ▼]   │
├─────────────────────────────────────────────────────────────┤
│ Photo │ ID          │ Name          │ Att%  │ Grade │ Flag │
│───────┼─────────────┼───────────────┼───────┼───────┼──────│
│  👤   │ HU/2025/001│ Ahmed Mohamed │  92%  │  B+   │      │
│  👤   │ HU/2025/002│ Fatima Ali    │  95%  │  A    │      │
│  👤   │ HU/2025/003│ Hassan Omar   │  68%  │  C    │  ⚠️  │
│  👤   │ HU/2025/004│ Amina Yusuf   │  88%  │  B    │      │
│ ...   │            │               │       │       │      │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ = Attendance below 75%                                   │
└─────────────────────────────────────────────────────────────┘
```

### 5. Course Materials Management (src/pages/academic/MaterialsPage.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ Course Materials - CS101-A                     [+ Upload]   │
├─────────────────────────────────────────────────────────────┤
│ Week 1: Introduction                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 Syllabus.pdf          │ Published │ [👁] [✏️] [🗑]   │ │
│ │ 📊 Week 1 Slides.pptx    │ Published │ [👁] [✏️] [🗑]   │ │
│ │ 🔗 Intro Video (YouTube) │ Published │ [👁] [✏️] [🗑]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Week 2: Programming Basics                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Week 2 Slides.pptx    │ Draft     │ [👁] [✏️] [🗑]   │ │
│ │ 📄 Lab Exercise 1.pdf    │ Draft     │ [👁] [✏️] [🗑]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Week Section]                                        │
└─────────────────────────────────────────────────────────────┘
```

### 6. Material Upload Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Upload Material                                    [X]      │
├─────────────────────────────────────────────────────────────┤
│ Title:       [Week 3 Lecture Notes                    ]     │
│ Description: [Introduction to loops and conditionals  ]     │
│ Type:        [Document             ▼]                       │
│ Week:        [3                    ▼]                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │   📁 Drop file here or click to browse                 │ │
│ │      Supported: PDF, DOC, DOCX, PPT, PPTX              │ │
│ │      Max size: 50MB                                     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☐ Publish immediately                                       │
│                                                             │
│                              [Cancel] [Upload]              │
└─────────────────────────────────────────────────────────────┘
```

### 7. HOD Dashboard (src/pages/academic/HODDashboardPage.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ Department of Computer Science                 Fall 2025    │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│ │ Faculty   │ │ Courses   │ │ Students  │ │ Classes   │    │
│ │    12     │ │    24     │ │    450    │ │    32     │    │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Faculty Workload                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Lecturer        │ Classes │ Students │ Att%  │ Grades  │ │
│ ├─────────────────┼─────────┼──────────┼───────┼─────────┤ │
│ │ Dr. Ahmed       │    4    │   142    │  85%  │   65%   │ │
│ │ Dr. Fatima      │    3    │   108    │  90%  │   80%   │ │
│ │ Mr. Hassan      │    5    │   175    │  78%  │   45%   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Alerts                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ 3 classes have attendance below 75%                  │ │
│ │ ⚠️ Midterm grades overdue for CS201-B                   │ │
│ │ ℹ️ 2 classes need room assignments                      │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ [Assign Lecturer] [View All Classes] [Generate Reports]    │
└─────────────────────────────────────────────────────────────┘
```

### 8. UI Components

**ClassCard.tsx:**
```tsx
<ClassCard
  class={classData}
  showStats={true}
  actions={['view', 'attendance', 'grades']}
/>
```

**PendingTaskItem.tsx:**
```tsx
<PendingTaskItem
  task={task}
  onAction={(action) => handleAction(action)}
/>
```

**MaterialUploader.tsx:**
```tsx
<MaterialUploader
  classId={classId}
  onUpload={(material) => addMaterial(material)}
  maxSize={50 * 1024 * 1024}  // 50MB
  allowedTypes={['pdf', 'doc', 'pptx', 'mp4']}
/>
```

**WorkloadChart.tsx:**
```tsx
<WorkloadChart
  faculty={facultyWorkload}
  showComparison={true}
/>
```

---

## Database Updates

```prisma
model CourseMaterial {
  id          String       @id @default(uuid())
  classId     String
  class       Class        @relation(fields: [classId], references: [id])
  title       String
  description String?
  type        MaterialType
  fileUrl     String?
  externalUrl String?
  fileSize    Int?
  mimeType    String?
  week        Int?
  orderIndex  Int          @default(0)
  isPublished Boolean      @default(false)
  publishedAt DateTime?
  uploadedById String
  uploadedBy  User         @relation(fields: [uploadedById], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
  
  @@index([classId])
}

enum MaterialType {
  DOCUMENT
  VIDEO
  LINK
  SLIDES
  SYLLABUS
  ASSIGNMENT
  OTHER
}
```

---

## Validation Checklist

- [ ] Lecturer dashboard shows current semester classes
- [ ] Today's schedule displays correctly
- [ ] Pending tasks list is accurate
- [ ] Class detail page shows all tabs
- [ ] Student roster displays with photos
- [ ] Attendance and grades show in roster
- [ ] Low attendance students are flagged
- [ ] Materials can be uploaded (PDF, PPT, DOC)
- [ ] Materials can be organized by week
- [ ] Materials can be published/unpublished
- [ ] Students only see published materials
- [ ] HOD can see department overview
- [ ] HOD can see faculty workload
- [ ] HOD can assign lecturers to classes
- [ ] Alerts show for overdue tasks
- [ ] Reports can be generated
- [ ] Mobile responsive layout works
