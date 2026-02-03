# Prompt 11: Class Management

## Objective
Implement class/section creation, scheduling, and room management.

## Location in Project
Place this file in: `hums-v2-project/prompts/11-class-management.md`

---

## Backend Implementation

### 1. Room Service (src/services/room.service.ts)
```typescript
interface Room {
  id: string;
  name: string;           // e.g., "Room 101", "Lab A"
  building: string;       // e.g., "Main Building"
  capacity: number;
  type: RoomType;         // CLASSROOM, LAB, AUDITORIUM
  facilities: string[];   // ['projector', 'whiteboard', 'computers']
  isActive: boolean;
}

createRoom(data: CreateRoomDto)
getRooms(filters?: { building?, type?, minCapacity? })
getRoomById(id: string)
updateRoom(id: string, data: UpdateRoomDto)
deleteRoom(id: string)
checkRoomAvailability(roomId: string, dayOfWeek: number, startTime: string, endTime: string)
getRoomSchedule(roomId: string, semesterId: string)
```

### 2. Class Service (src/services/class.service.ts)
```typescript
interface Class {
  id: string;
  name: string;           // e.g., "CS101-A", "CS101-B"
  courseId: string;
  semesterId: string;
  lecturerId: string;
  capacity: number;
  enrolledCount: number;  // Computed
  roomId?: string;
  status: ClassStatus;    // OPEN, CLOSED, CANCELLED
}

createClass(data: {
  courseId: string;
  semesterId: string;
  lecturerId: string;
  capacity: number;
  name?: string;          // Auto-generate if not provided
})
getClasses(filters: { semesterId?, courseId?, lecturerId?, status? }, pagination)
getClassById(id: string)
updateClass(id: string, data: UpdateClassDto)
deleteClass(id: string)   // Only if no enrollments
cancelClass(id: string, reason: string)
getClassStudents(id: string)
getClassSchedule(id: string)
splitClass(id: string)    // Create new section when over capacity
assignLecturer(classId: string, lecturerId: string)
assignRoom(classId: string, roomId: string)
```

### 3. Schedule Service (src/services/schedule.service.ts)
```typescript
interface Schedule {
  id: string;
  classId: string;
  dayOfWeek: number;      // 0=Sunday, 1=Monday, etc.
  startTime: string;      // "08:00"
  endTime: string;        // "09:30"
  roomId: string;
  type: ScheduleType;     // LECTURE, LAB, TUTORIAL
}

createSchedule(data: CreateScheduleDto)
getSchedulesByClass(classId: string)
getSchedulesByRoom(roomId: string, semesterId: string)
getSchedulesByLecturer(lecturerId: string, semesterId: string)
updateSchedule(id: string, data: UpdateScheduleDto)
deleteSchedule(id: string)
checkConflicts(schedule: CreateScheduleDto): ConflictResult[]
generateWeeklyView(entityType: 'class' | 'room' | 'lecturer', entityId: string, semesterId: string)
```

### 4. Conflict Detection
```typescript
interface ConflictResult {
  type: 'ROOM_CONFLICT' | 'LECTURER_CONFLICT' | 'STUDENT_CONFLICT';
  conflictingScheduleId: string;
  message: string;
}

// Check before creating/updating schedule:
// 1. Room not double-booked
// 2. Lecturer not teaching elsewhere
// 3. (Optional) No student enrolled in both classes
```

### 5. API Routes

**Rooms:**
```
GET    /api/v1/rooms
POST   /api/v1/rooms
GET    /api/v1/rooms/:id
PATCH  /api/v1/rooms/:id
DELETE /api/v1/rooms/:id
GET    /api/v1/rooms/:id/schedule?semesterId=
GET    /api/v1/rooms/:id/availability?day=&start=&end=
```

**Classes:**
```
GET    /api/v1/classes
POST   /api/v1/classes
GET    /api/v1/classes/:id
PATCH  /api/v1/classes/:id
DELETE /api/v1/classes/:id
GET    /api/v1/classes/:id/students
GET    /api/v1/classes/:id/schedule
POST   /api/v1/classes/:id/split
PATCH  /api/v1/classes/:id/assign-lecturer
PATCH  /api/v1/classes/:id/assign-room
PATCH  /api/v1/classes/:id/cancel
```

**Schedules:**
```
GET    /api/v1/schedules
POST   /api/v1/schedules
GET    /api/v1/schedules/:id
PATCH  /api/v1/schedules/:id
DELETE /api/v1/schedules/:id
POST   /api/v1/schedules/check-conflicts
GET    /api/v1/schedules/weekly?type=&id=&semesterId=
```

---

## Frontend Implementation

### 1. Room Management Pages (src/pages/admin/rooms/)

**RoomListPage.tsx:**
- Table with building filter
- Capacity and type columns
- Quick view of today's schedule

**RoomFormPage.tsx:**
- Name, building, capacity
- Room type dropdown
- Facilities checkboxes
- Active toggle

**RoomSchedulePage.tsx:**
- Weekly calendar view for single room
- Show all classes using this room
- Highlight conflicts

### 2. Class Management Pages (src/pages/admin/classes/)

**ClassListPage.tsx:**
- Filter by semester, course, lecturer
- Show: name, course, lecturer, enrolled/capacity, status
- Bulk actions: assign room, cancel

**ClassFormPage.tsx:**
```
┌─────────────────────────────────────────┐
│ Create New Class                        │
├─────────────────────────────────────────┤
│ Semester:    [Fall 2025        ▼]       │
│ Course:      [CS101 - Intro... ▼]       │
│ Section:     [A                 ]       │
│ Lecturer:    [Dr. Ahmed Mohamed▼]       │
│ Capacity:    [40                ]       │
│ Room:        [Room 101         ▼]       │
├─────────────────────────────────────────┤
│ Schedule                                │
│ [+ Add Time Slot]                       │
│ ┌─────────────────────────────────────┐ │
│ │ Mon │ 08:00-09:30 │ Room 101 │ [x] │ │
│ │ Wed │ 08:00-09:30 │ Room 101 │ [x] │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘
```

**ClassDetailPage.tsx:**
- Class info header
- Enrolled students list
- Schedule display
- Attendance summary (Phase 2)
- Grade summary (Phase 2)

### 3. Schedule Components

**WeeklyScheduleGrid.tsx:**
```
         │ Sun │ Mon │ Tue │ Wed │ Thu │
─────────┼─────┼─────┼─────┼─────┼─────┤
08:00    │     │CS101│     │CS101│     │
─────────┼─────┼─────┼─────┼─────┼─────┤
09:30    │     │     │CS102│     │CS102│
─────────┼─────┼─────┼─────┼─────┼─────┤
11:00    │     │     │     │     │     │
```

**ScheduleSlotForm.tsx:**
- Day of week dropdown
- Start time picker
- End time picker
- Room selector (filtered by availability)
- Type (Lecture/Lab/Tutorial)

**ConflictAlert.tsx:**
- Show conflict warnings
- Link to conflicting class
- Suggest alternatives

### 4. UI Components

**CapacityBadge.tsx:**
```tsx
// Shows enrolled/capacity with color coding
<CapacityBadge enrolled={38} capacity={40} />
// Displays: "38/40" in yellow (near full)
// Colors: green (<70%), yellow (70-90%), red (>90%)
```

**ClassStatusBadge.tsx:**
- OPEN = green
- CLOSED = gray
- CANCELLED = red

**TimeSlotPicker.tsx:**
- Time selection with 30-min intervals
- Validates end > start

**RoomSelector.tsx:**
- Dropdown with availability check
- Shows capacity
- Filters out unavailable rooms

---

## Database Updates

Add to Prisma schema if not already present:

```prisma
model Room {
  id          String     @id @default(uuid())
  name        String
  building    String
  capacity    Int
  type        RoomType   @default(CLASSROOM)
  facilities  String[]
  isActive    Boolean    @default(true)
  schedules   Schedule[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?
}

enum RoomType {
  CLASSROOM
  LAB
  AUDITORIUM
  SEMINAR_ROOM
}

enum ClassStatus {
  OPEN
  CLOSED
  CANCELLED
}

enum ScheduleType {
  LECTURE
  LAB
  TUTORIAL
}
```

---

## Validation Checklist

- [ ] Can create rooms with different types
- [ ] Can create class for a course/semester
- [ ] Class name auto-generates (CS101-A, CS101-B)
- [ ] Can add multiple schedule slots to a class
- [ ] Conflict detection prevents double-booking rooms
- [ ] Conflict detection prevents lecturer overlap
- [ ] Weekly schedule view works for room/lecturer/class
- [ ] Can split class into new section
- [ ] Enrolled count updates correctly
- [ ] Cannot delete class with enrollments
- [ ] Cancelled classes show appropriate status
