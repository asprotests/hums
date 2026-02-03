cd hums-v2-project

# 01 - Project Setup
claude "Read CLAUDE.md for context, then execute prompts/01-project-setup.md"
claude "Verify: backend and frontend folders exist, npm install works, both start with npm run dev"

# 02 - Database Schema
claude "Execute prompts/02-database-schema.md"
claude "Verify: run npx prisma migrate dev, confirm all tables created"

# 03 - Authentication
claude "Execute prompts/03-authentication.md"
claude "Verify: test login API with sample credentials, confirm JWT token returned"

# 04 - RBAC User Management
claude "Execute prompts/04-rbac-user-management.md"
claude "Verify: create a user, assign role, confirm permissions work"

# 05 - Academic Structure
claude "Execute prompts/05-academic-structure.md"
claude "Verify: create faculty, department, program, course - confirm all CRUD works"

# 06 - Student Admission
claude "Execute prompts/06-student-admission.md"
claude "Verify: submit application, approve it, confirm student record created"

# 07 - Finance Basic
claude "Execute prompts/07-finance-basic.md"
claude "Verify: create fee structure, generate invoice, record payment, download receipt"

# 08 - Student Portal
claude "Execute prompts/08-student-portal.md"
claude "Verify: login as student, view dashboard, check schedule, grades, attendance"

# 09 - i18n System Config
claude "Execute prompts/09-i18n-system-config.md"
claude "Verify: change language, confirm UI updates, check system settings save"

# 10 - Audit Testing
claude "Execute prompts/10-audit-testing-completion.md"
claude "Verify: run npm test in backend and frontend, confirm audit logs capture actions"

# 11 - Class Management
claude "Execute prompts/11-class-management.md"
claude "Verify: create room, create class, add schedule, check conflict detection"

# 12 - Course Registration
claude "Execute prompts/12-course-registration.md"
claude "Verify: student registers for class, prerequisites checked, capacity enforced"

# 13 - Attendance System
claude "Execute prompts/13-attendance-system.md"
claude "Verify: mark attendance, view attendance report, check QR generation"

# 14 - Grading Exams
claude "Execute prompts/14-grading-exams.md"
claude "Verify: create grade components, enter grades, calculate GPA, generate transcript"

# 15 - Academic Portal
claude "Execute prompts/15-academic-portal.md"
claude "Verify: lecturer dashboard loads, can view classes, upload materials"

# 16 - HR Employee Management
claude "Execute prompts/16-hr-employee-management.md"
claude "Verify: create employee, upload documents, create contract, start onboarding"

# 17 - Leave Payroll
claude "Execute prompts/17-leave-payroll.md"
claude "Verify: submit leave request, approve it, process payroll, generate payslip"

# 18 - Library Catalog
claude "Execute prompts/18-library-catalog.md"
claude "Verify: add book, add copies, search works, categories display"

# 19 - Book Borrowing
claude "Execute prompts/19-book-borrowing.md"
claude "Verify: issue book, return book, check overdue, renew works"

# 20 - Email Integration
claude "Execute prompts/20-email-integration.md"
claude "Verify: send test email, notifications appear, templates render"

# 21 - SMS Payment Gateway
claude "Execute prompts/21-sms-payment-gateway.md"
claude "Verify: send test SMS, initiate payment, webhook processes correctly"

# 22 - Advanced Finance
claude "Execute prompts/22-advanced-finance.md"
claude "Verify: award scholarship, create payment plan, process refund, track budget"

# 23 - 2FA Notifications
claude "Execute prompts/23-2fa-notifications.md"
claude "Verify: enable 2FA, generate QR code, verify OTP, notification preferences save"

# 24 - Offline Performance Polish
claude "Execute prompts/24-offline-performance-polish.md"
claude "Verify: app works offline, syncs when online, all user journeys pass"