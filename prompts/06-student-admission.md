# Prompt 06: Student Admission & Management

## Objective
Implement student admission workflow and student management.

## Backend Implementation

### 1. Student ID Generation
Format: `HU/YYYY/NNNN`
- HU = Hormuud University
- YYYY = Admission year
- NNNN = Sequential number (padded)

Example: `HU/2025/0001`, `HU/2025/0002`

```typescript
// Auto-generate on admission approval
generateStudentId(admissionYear: number): string
```

### 2. Admission Service (src/services/admission.service.ts)

**Admission Workflow:**
1. **PENDING** - Application submitted
2. **UNDER_REVIEW** - Being reviewed
3. **APPROVED** - Approved for enrollment
4. **REJECTED** - Application rejected
5. **ENROLLED** - Converted to student

```typescript
createApplication(data: ApplicationData)
getApplications(filters: { status?, programId? }, pagination)
getApplicationById(id)
updateApplication(id, data)
reviewApplication(id, status, remarks?)
approveApplication(id)  // Moves to APPROVED
rejectApplication(id, reason)
enrollStudent(applicationId)  // Creates Student + User, generates ID
```

### 3. Student Service (src/services/student.service.ts)
```typescript
getStudents(filters: { programId?, status?, facultyId?, search? }, pagination)
getStudentById(id)
getStudentByStudentId(studentId)  // HU/2025/0001
updateStudent(id, data)
deactivateStudent(id, reason)
transferStudent(id, newProgramId, reason)
getStudentEnrollments(id)
getStudentGrades(id)
getStudentPayments(id)
getStudentAttendance(id)
generateTranscript(id)  // PDF generation
```

### 4. Document Service
```typescript
uploadDocument(file, type, relatedId)
getDocuments(relatedId, type?)
deleteDocument(id)
```

Document types: `ID_CARD`, `CERTIFICATE`, `PHOTO`, `OTHER`

### 5. API Routes

**Admission:**
```
GET    /api/v1/admissions
POST   /api/v1/admissions
GET    /api/v1/admissions/:id
PATCH  /api/v1/admissions/:id
PATCH  /api/v1/admissions/:id/review
PATCH  /api/v1/admissions/:id/approve
PATCH  /api/v1/admissions/:id/reject
POST   /api/v1/admissions/:id/enroll
GET    /api/v1/admissions/statistics
```

**Students:**
```
GET    /api/v1/students
GET    /api/v1/students/:id
PATCH  /api/v1/students/:id
DELETE /api/v1/students/:id
GET    /api/v1/students/:id/enrollments
GET    /api/v1/students/:id/grades
GET    /api/v1/students/:id/payments
GET    /api/v1/students/:id/attendance
GET    /api/v1/students/:id/transcript
POST   /api/v1/students/:id/transfer
POST   /api/v1/students/:id/documents
GET    /api/v1/students/:id/documents
```

### 6. Application Form Fields
**Personal Information:**
- First Name, Middle Name, Last Name (English)
- First Name, Last Name (Somali)
- Date of Birth
- Gender
- Phone Number
- Email
- Address (City, District)
- Emergency Contact (Name, Phone, Relationship)

**Academic Information:**
- Previous Education Level
- School Name
- Graduation Year
- Program Applying For

**Documents:**
- National ID / Passport (required)
- Secondary School Certificate (required)
- Passport Photo (required)
- Additional Documents (optional)

## Frontend Implementation

### 1. Admission Pages (src/pages/admin/admissions/)
- `AdmissionListPage.tsx` - Table with status filters, tabs
- `AdmissionFormPage.tsx` - Multi-step form
- `AdmissionDetailPage.tsx` - View application + actions
- `AdmissionReviewPage.tsx` - Review workflow UI

### 2. Student Pages (src/pages/admin/students/)
- `StudentListPage.tsx` - Table with filters
- `StudentDetailPage.tsx` - Full student profile
- `StudentEditPage.tsx` - Edit student info
- `StudentTransferPage.tsx` - Transfer form

### 3. Multi-Step Admission Form
```
Step 1: Personal Information
Step 2: Academic Background
Step 3: Program Selection
Step 4: Document Upload
Step 5: Review & Submit
```

### 4. UI Components
- `ApplicationStatusBadge` - Color-coded status
- `DocumentUpload` - File upload with preview
- `DocumentList` - List uploaded documents
- `AdmissionTimeline` - Show workflow progress
- `StudentIdCard` - Preview ID card

### 5. Admission Workflow UI
```
[Pending] → [Review] → [Approve/Reject] → [Enroll]
                ↓
          [Request More Info]
```

Each status change should:
- Show confirmation dialog
- Allow adding remarks
- Send notification (future)

### 6. Student Profile Sections
- Personal Information
- Academic Information (Program, Year, Status)
- Enrollment History
- Grades Overview
- Payment History
- Attendance Summary
- Documents

### 7. Dashboard Widget
- Pending Applications count
- Recent Applications list
- Admission Statistics chart

## Validation Rules
- Email must be unique
- Phone must be valid Somali format (+252...)
- Age must be 16+ for university
- Required documents must be uploaded
- File size limit: 5MB per document
- Allowed formats: PDF, JPG, PNG

## Validation Checklist
- [ ] Can submit admission application
- [ ] Multi-step form saves progress
- [ ] Documents upload correctly
- [ ] Can review and approve application
- [ ] Student ID auto-generates on enrollment
- [ ] User account created for student
- [ ] Student appears in student list
- [ ] Can transfer student to another program
- [ ] Admission statistics show correctly
