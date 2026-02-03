# Prompt 05: Academic Structure Management

## Objective
Build the academic structure modules: Faculties, Departments, Programs, Courses, Academic Years.

## Backend Implementation

### 1. Faculty Service (src/services/faculty.service.ts)
```typescript
createFaculty(data: { name, nameLocal?, code, deanId? })
getFaculties(filters?, pagination?)
getFacultyById(id)
updateFaculty(id, data)
deleteFaculty(id)  // Only if no departments
getFacultyStatistics(id)  // Student count, department count, etc.
```

### 2. Department Service
```typescript
createDepartment(data: { name, nameLocal?, code, facultyId, hodId? })
getDepartments(filters: { facultyId? }, pagination?)
getDepartmentById(id)
updateDepartment(id, data)
deleteDepartment(id)  // Only if no programs
getDepartmentPrograms(id)
getDepartmentEmployees(id)
```

### 3. Program Service
```typescript
createProgram(data: { name, nameLocal?, code, type, durationYears, totalCredits, departmentId })
getPrograms(filters: { departmentId?, type? }, pagination?)
getProgramById(id)
updateProgram(id, data)
deleteProgram(id)  // Only if no students enrolled
getProgramCurriculum(id)
getProgramStudents(id)
```

### 4. Course Service
```typescript
createCourse(data: { name, nameLocal?, code, credits, description?, departmentId, prerequisiteIds? })
getCourses(filters: { departmentId?, search? }, pagination?)
getCourseById(id)
updateCourse(id, data)
deleteCourse(id)  // Only if not in any enrollment
addPrerequisite(courseId, prerequisiteId)
removePrerequisite(courseId, prerequisiteId)
getCourseClasses(id)
```

### 5. Academic Year Service
```typescript
createAcademicYear(data: { name, startDate, endDate })
getAcademicYears()
setCurrentAcademicYear(id)
getAcademicYearSemesters(id)
```

### 6. Semester Service
```typescript
createSemester(data: { name, academicYearId, startDate, endDate, registrationStart, registrationEnd })
getSemesters(filters: { academicYearId? })
setCurrentSemester(id)
```

### 7. API Routes

**Faculties:**
```
GET    /api/v1/faculties
POST   /api/v1/faculties
GET    /api/v1/faculties/:id
PATCH  /api/v1/faculties/:id
DELETE /api/v1/faculties/:id
GET    /api/v1/faculties/:id/departments
GET    /api/v1/faculties/:id/statistics
```

**Departments:**
```
GET    /api/v1/departments
POST   /api/v1/departments
GET    /api/v1/departments/:id
PATCH  /api/v1/departments/:id
DELETE /api/v1/departments/:id
GET    /api/v1/departments/:id/programs
GET    /api/v1/departments/:id/courses
GET    /api/v1/departments/:id/employees
```

**Programs:**
```
GET    /api/v1/programs
POST   /api/v1/programs
GET    /api/v1/programs/:id
PATCH  /api/v1/programs/:id
DELETE /api/v1/programs/:id
GET    /api/v1/programs/:id/curriculum
GET    /api/v1/programs/:id/students
```

**Courses:**
```
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:id
PATCH  /api/v1/courses/:id
DELETE /api/v1/courses/:id
POST   /api/v1/courses/:id/prerequisites
DELETE /api/v1/courses/:id/prerequisites/:prereqId
```

**Academic Calendar:**
```
GET    /api/v1/academic-years
POST   /api/v1/academic-years
GET    /api/v1/academic-years/:id
PATCH  /api/v1/academic-years/:id
PATCH  /api/v1/academic-years/:id/set-current

GET    /api/v1/semesters
POST   /api/v1/semesters
GET    /api/v1/semesters/:id
PATCH  /api/v1/semesters/:id
PATCH  /api/v1/semesters/:id/set-current
GET    /api/v1/semesters/current  # Get current active semester
```

## Frontend Implementation

### 1. Academic Structure Pages (src/pages/admin/academic/)

**Faculty Pages:**
- `FacultyListPage.tsx` - Cards or table view
- `FacultyFormPage.tsx` - Create/edit with dean selection
- `FacultyDetailPage.tsx` - Overview with departments list

**Department Pages:**
- `DepartmentListPage.tsx` - Table with faculty filter
- `DepartmentFormPage.tsx` - Create/edit
- `DepartmentDetailPage.tsx` - Overview with programs, courses

**Program Pages:**
- `ProgramListPage.tsx` - Table with filters
- `ProgramFormPage.tsx` - Create/edit with curriculum builder
- `ProgramDetailPage.tsx` - Overview with students count

**Course Pages:**
- `CourseListPage.tsx` - Table with search
- `CourseFormPage.tsx` - Create/edit with prerequisites selector

**Academic Calendar:**
- `AcademicCalendarPage.tsx` - Manage years and semesters

### 2. UI Components Needed
- `FacultyCard` - Display faculty summary
- `DepartmentCard` - Display department summary
- `ProgramTypeBadge` - BACHELOR, DIPLOMA, etc.
- `PrerequisiteSelector` - Multi-select for courses
- `HierarchyBreadcrumb` - Faculty > Dept > Program navigation
- `CalendarTimeline` - Visual academic year/semester display

### 3. Form Validations
- Code must be unique (check on blur)
- Name required, min 3 characters
- Credits between 1-10
- Duration years between 1-6
- Dates must be logical (end > start)

### 4. Navigation Structure
```
Admin Portal
└── Academic Structure
    ├── Faculties
    │   └── Departments (nested)
    │       └── Programs (nested)
    ├── Courses
    └── Academic Calendar
        ├── Academic Years
        └── Semesters
```

## Seed Data for Testing
- 2 Faculties (Computing, Business)
- 3 Departments (CS, IT, Management)
- 4 Programs (BSc CS, BSc IT, BBA, Diploma in IT)
- 10 Courses with prerequisites
- Current academic year 2025-2026
- 2 semesters (Fall 2025, Spring 2026)

## Validation Checklist
- [ ] Can create full hierarchy: Faculty → Department → Program
- [ ] Course prerequisites work correctly
- [ ] Cannot delete faculty with departments
- [ ] Cannot delete course with enrollments
- [ ] Current semester is highlighted
- [ ] Bilingual names (English + Somali) save correctly
- [ ] Statistics show correct counts
