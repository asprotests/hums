# Phase 2: Academic & HR Modules

## Overview
Phase 2 completes the academic portal and adds HR functionality.

## Duration Target: 4-5 weeks

---

## 2.1 Academic Portal - Full

### Course & Class Management
| Req ID | Requirement |
|--------|-------------|
| ACA-CM-001 | View assigned courses/classes |
| ACA-CM-002 | Course material upload |
| ACA-CM-004 | Class roster with photos |
| ACA-CM-005 | Class schedule view |

**Features:**
- [ ] Lecturer dashboard
- [ ] Assigned classes list
- [ ] Class roster view
- [ ] Course material upload/management
- [ ] Class schedule display

### Attendance Management
| Req ID | Requirement |
|--------|-------------|
| ACA-AT-001 | Digital attendance marking |
| ACA-AT-003 | Auto-calculate percentages |
| ACA-AT-004 | Flag low attendance |
| ACA-AT-005 | Attendance correction |
| ACA-AT-006 | Attendance reports |

**Features:**
- [ ] Mark attendance UI
- [ ] Attendance history view
- [ ] Percentage calculation
- [ ] Low attendance alerts
- [ ] Correction with audit trail
- [ ] Attendance reports (by class/student)

### Examinations & Grading
| Req ID | Requirement |
|--------|-------------|
| ACA-EX-001 | Exam scheduling |
| ACA-EX-002 | Grade entry (midterm, final, assignments) |
| ACA-EX-003 | Calculate final grades |
| ACA-EX-006 | Generate grade sheets |
| ACA-EX-007 | GPA/CGPA calculation |
| ACA-EX-009 | Lock grades after deadline |
| ACA-EX-010 | Publish results |

**Features:**
- [ ] Exam schedule management
- [ ] Grade entry interface
- [ ] Grade weightage configuration
- [ ] Final grade calculation
- [ ] Grade sheet generation
- [ ] GPA/CGPA calculation
- [ ] Grade finalization & locking
- [ ] Result publication

---

## 2.2 Student Portal - Extended

### Academic Records
| Req ID | Requirement |
|--------|-------------|
| STU-RP-003 | Course registration |
| STU-RP-004 | View schedule |
| STU-AR-001 | View grades |
| STU-AR-002 | Academic history with GPA |
| STU-AR-003 | Unofficial transcript |
| STU-AR-004 | View attendance |
| STU-AR-005 | Exam schedules |

**Features:**
- [ ] Course registration during open period
- [ ] Weekly schedule view
- [ ] Current semester grades
- [ ] Complete academic history
- [ ] GPA/CGPA display
- [ ] Unofficial transcript download
- [ ] Attendance view
- [ ] Exam schedule

### Communication
| Req ID | Requirement |
|--------|-------------|
| STU-CM-001 | View announcements |
| STU-CM-002 | Access course materials |
| STU-CM-003 | Assignment submission |
| STU-CM-006 | Notification center |

**Features:**
- [ ] Announcements feed
- [ ] Course materials access
- [ ] Assignment submission
- [ ] Notifications panel

---

## 2.3 Assignment Management

| Req ID | Requirement |
|--------|-------------|
| ACA-AS-001 | Create assignments with deadlines |
| ACA-AS-002 | File submission |
| ACA-AS-004 | Inline feedback |
| ACA-AS-005 | Deadline reminders |
| ACA-AS-006 | Late submission tracking |

**Features:**
- [ ] Assignment creation (lecturer)
- [ ] File upload/submission (student)
- [ ] Grading interface
- [ ] Feedback comments
- [ ] Deadline notifications
- [ ] Late penalty configuration

---

## 2.4 HR/Staff Portal

### Employee Management
| Req ID | Requirement |
|--------|-------------|
| HRM-001 | Employee records |
| HRM-003 | Employee attendance |
| HRM-011 | Department assignments |
| HRM-012 | HR reports |

**Features:**
- [ ] Employee list & search
- [ ] Employee profile management
- [ ] Department assignments
- [ ] Employee attendance tracking
- [ ] Basic HR reports

### Leave Management
| Req ID | Requirement |
|--------|-------------|
| HRM-004 | Leave requests & approvals |
| HRM-005 | Leave types with balance |

**Features:**
- [ ] Leave request submission
- [ ] Approval workflow
- [ ] Leave balance tracking
- [ ] Leave calendar view
- [ ] Leave reports

### Payroll
| Req ID | Requirement |
|--------|-------------|
| HRM-006 | Payroll processing |
| HRM-007 | Payslips generation |
| HRM-008 | Loans and deductions |

**Features:**
- [ ] Salary structure setup
- [ ] Monthly payroll processing
- [ ] Allowances & deductions
- [ ] Payslip generation (PDF)
- [ ] Payroll reports

---

## 2.5 Enhanced Admin Features

### Student Management
| Req ID | Requirement |
|--------|-------------|
| ADM-SA-002 | Multi-stage admission workflow |
| ADM-SA-004 | Student ID cards with QR |
| ADM-SA-005 | Student transfers |
| ADM-SA-007 | Automated notifications |

**Features:**
- [ ] Full admission workflow
- [ ] ID card generation
- [ ] QR code on ID cards
- [ ] Faculty/department transfers
- [ ] Email notifications

### Class Management
| Req ID | Requirement |
|--------|-------------|
| ADM-AS-006 | Class creation with capacity |
| ADM-AS-007 | Class splitting |

**Features:**
- [ ] Class creation
- [ ] Capacity management
- [ ] Auto-split suggestions

---

## 2.6 Reporting - Extended

| Req ID | Requirement |
|--------|-------------|
| ADM-RP-001 | Dashboard with visualizations |
| ADM-RP-002 | Enrollment statistics |
| ADM-RP-004 | Staff/faculty reports |
| ADM-RP-006 | Export PDF/Excel/CSV |
| ADM-RP-008 | Charts and graphs |

**Features:**
- [ ] Admin dashboard with KPIs
- [ ] Enrollment charts
- [ ] Attendance trends
- [ ] Academic performance graphs
- [ ] Export functionality
- [ ] Staff reports

---

## Database Migrations for Phase 2

```
011_create_classes.sql
012_create_enrollments.sql
013_create_attendance.sql
014_create_grades.sql
015_create_assignments.sql
016_create_employees.sql
017_create_leave_requests.sql
018_create_payroll.sql
019_add_id_card_fields.sql
```

---

## Testing Requirements

### Unit Tests
- [ ] Grade calculation tests
- [ ] GPA/CGPA calculation
- [ ] Attendance percentage
- [ ] Payroll calculation

### Integration Tests
- [ ] Course registration flow
- [ ] Grade entry → student view
- [ ] Leave approval workflow
- [ ] Payroll processing

---

## Definition of Done (Phase 2)

- [ ] Full academic cycle working (register → attend → grade → view)
- [ ] HR can manage employees and payroll
- [ ] Students can register for courses and view grades
- [ ] Lecturers can mark attendance and enter grades
- [ ] Admin dashboard with key metrics
- [ ] Reports exportable
