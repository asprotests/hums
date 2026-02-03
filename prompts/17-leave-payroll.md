# Prompt 17: Leave Management & Payroll System

## Objective
Implement complete leave management and payroll processing system.

## Location in Project
Place this file in: `hums-v2-project/prompts/17-leave-payroll.md`

---

## Backend Implementation

### 1. Leave Type Service (src/services/leaveType.service.ts)
```typescript
interface LeaveType {
  id: string;
  name: string;              // Annual, Sick, Maternity, etc.
  nameLocal: string;         // Somali name
  daysPerYear: number;       // Allocation per year
  carryForward: boolean;     // Can unused days carry forward?
  maxCarryDays: number;      // Max days to carry
  requiresDocument: boolean; // Needs supporting document?
  isPaid: boolean;
  isActive: boolean;
}

// Default leave types
const defaultTypes = [
  { name: 'Annual Leave', daysPerYear: 21, isPaid: true, carryForward: true },
  { name: 'Sick Leave', daysPerYear: 14, isPaid: true, requiresDocument: true },
  { name: 'Maternity Leave', daysPerYear: 90, isPaid: true },
  { name: 'Paternity Leave', daysPerYear: 7, isPaid: true },
  { name: 'Unpaid Leave', daysPerYear: 30, isPaid: false },
  { name: 'Compassionate Leave', daysPerYear: 5, isPaid: true },
];

getLeaveTypes(): LeaveType[]
createLeaveType(data: CreateLeaveTypeDto): LeaveType
updateLeaveType(id: string, data: UpdateLeaveTypeDto): LeaveType
```

### 2. Leave Balance Service (src/services/leaveBalance.service.ts)
```typescript
interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;         // In pending requests
  carriedForward: number;
  available: number;       // Computed
}

getEmployeeBalances(employeeId: string, year?: number): LeaveBalance[]
allocateLeave(employeeId: string, leaveTypeId: string, year: number, days: number): void
deductLeave(employeeId: string, leaveTypeId: string, days: number): void
carryForwardLeaves(year: number): void  // Run at year end
resetAnnualLeaves(year: number): void   // Allocate new year leaves
```

### 3. Leave Request Service (src/services/leaveRequest.service.ts)
```typescript
interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: DateTime;
  endDate: DateTime;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  status: LeaveStatus;
  approverId?: string;
  approverRemarks?: string;
  approvedAt?: DateTime;
}

enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

submitRequest(employeeId: string, data: CreateLeaveRequestDto): LeaveRequest
getRequests(filters: LeaveRequestFilters, pagination): LeaveRequest[]
getEmployeeRequests(employeeId: string, year?: number): LeaveRequest[]
getPendingApprovals(approverId: string): LeaveRequest[]
approveRequest(requestId: string, approverId: string, remarks?: string): void
rejectRequest(requestId: string, approverId: string, remarks: string): void
cancelRequest(requestId: string): void
calculateBusinessDays(startDate: Date, endDate: Date): number
checkConflicts(employeeId: string, startDate: Date, endDate: Date): boolean
```

### 4. Payroll Service (src/services/payroll.service.ts)
```typescript
interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: Decimal;
  allowances: PayrollAllowance[];
  deductions: PayrollDeduction[];
  grossSalary: Decimal;
  totalDeductions: Decimal;
  netSalary: Decimal;
  status: PayrollStatus;
  processedAt?: DateTime;
  paidAt?: DateTime;
}

interface PayrollAllowance {
  name: string;
  amount: Decimal;
  type: 'FIXED' | 'PERCENTAGE';
}

interface PayrollDeduction {
  name: string;
  amount: Decimal;
  type: 'FIXED' | 'PERCENTAGE';
}

enum PayrollStatus {
  DRAFT = 'DRAFT',
  PROCESSED = 'PROCESSED',
  APPROVED = 'APPROVED',
  PAID = 'PAID'
}

// Processing
processPayroll(month: number, year: number, departmentId?: string): Payroll[]
processEmployeePayroll(employeeId: string, month: number, year: number): Payroll
calculatePayroll(employeeId: string, month: number, year: number): PayrollCalculation

// Management
getPayrolls(filters: PayrollFilters, pagination): Payroll[]
getEmployeePayrolls(employeeId: string, year?: number): Payroll[]
approvePayroll(payrollId: string, approvedById: string): void
markAsPaid(payrollId: string): void
bulkMarkAsPaid(payrollIds: string[]): void

// Reports
generatePayslip(payrollId: string): PDF
generatePayrollReport(month: number, year: number): PayrollReport
getBankFile(month: number, year: number): CSVFile  // For bank upload
```

### 5. Salary Component Service (src/services/salaryComponent.service.ts)
```typescript
interface SalaryComponent {
  id: string;
  name: string;
  type: 'ALLOWANCE' | 'DEDUCTION';
  calculationType: 'FIXED' | 'PERCENTAGE';
  defaultValue: Decimal;
  isActive: boolean;
  appliesToAll: boolean;
}

// Default components
const defaults = [
  { name: 'Housing Allowance', type: 'ALLOWANCE', calculationType: 'PERCENTAGE', defaultValue: 15 },
  { name: 'Transport Allowance', type: 'ALLOWANCE', calculationType: 'FIXED', defaultValue: 50 },
  { name: 'Tax', type: 'DEDUCTION', calculationType: 'PERCENTAGE', defaultValue: 5 },
  { name: 'Pension', type: 'DEDUCTION', calculationType: 'PERCENTAGE', defaultValue: 3 },
];

getSalaryComponents(): SalaryComponent[]
createComponent(data: CreateComponentDto): SalaryComponent
assignToEmployee(componentId: string, employeeId: string, value?: Decimal): void
```

### 6. API Routes

**Leave Types:**
```
GET    /api/v1/leave-types
POST   /api/v1/leave-types
PATCH  /api/v1/leave-types/:id
```

**Leave Balances:**
```
GET    /api/v1/employees/:id/leave-balances
POST   /api/v1/leave-balances/allocate
POST   /api/v1/leave-balances/carry-forward
```

**Leave Requests:**
```
GET    /api/v1/leave-requests
POST   /api/v1/leave-requests
GET    /api/v1/leave-requests/:id
DELETE /api/v1/leave-requests/:id           # Cancel
POST   /api/v1/leave-requests/:id/approve
POST   /api/v1/leave-requests/:id/reject
GET    /api/v1/leave-requests/pending       # For approver
GET    /api/v1/employees/:id/leave-requests
GET    /api/v1/leave-calendar?month=&year=
```

**Payroll:**
```
GET    /api/v1/payrolls
POST   /api/v1/payrolls/process
GET    /api/v1/payrolls/:id
POST   /api/v1/payrolls/:id/approve
POST   /api/v1/payrolls/:id/mark-paid
POST   /api/v1/payrolls/bulk-mark-paid
GET    /api/v1/payrolls/:id/payslip
GET    /api/v1/employees/:id/payrolls
GET    /api/v1/payrolls/report?month=&year=
GET    /api/v1/payrolls/bank-file?month=&year=
```

**Salary Components:**
```
GET    /api/v1/salary-components
POST   /api/v1/salary-components
PATCH  /api/v1/salary-components/:id
POST   /api/v1/salary-components/:id/assign
```

**Employee Self-Service:**
```
GET    /api/v1/employee/leave-balances
GET    /api/v1/employee/leave-requests
POST   /api/v1/employee/leave-requests
GET    /api/v1/employee/payslips
GET    /api/v1/employee/payslips/:id
```

---

## Frontend Implementation

### 1. Leave Management Pages (src/pages/hr/leave/)

**LeaveTypesPage.tsx:**
- Manage leave types
- Set allocations
- Configure rules

**LeaveRequestsPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Leave Requests                              [+ New Request] │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] Status: [Pending ▼] Date: [This Month ▼]   │
├─────────────────────────────────────────────────────────────┤
│ Employee      │ Type    │ Dates           │ Days │ Status  │
│───────────────┼─────────┼─────────────────┼──────┼─────────│
│ Ahmed Mohamed │ Annual  │ Feb 20-25, 2025 │  5   │ Pending │
│               │         │                 │      │ [✓] [✗] │
│ Fatima Ali    │ Sick    │ Feb 15-16, 2025 │  2   │ Approved│
│ Hassan Omar   │ Annual  │ Mar 1-10, 2025  │  8   │ Pending │
│               │         │                 │      │ [✓] [✗] │
└─────────────────────────────────────────────────────────────┘
```

**LeaveCalendarPage.tsx:**
- Calendar view of all leaves
- Color-coded by type
- Department filter

**LeaveBalancesPage.tsx:**
- All employees' leave balances
- Bulk allocation
- Year-end carry forward

### 2. Payroll Pages (src/pages/hr/payroll/)

**PayrollProcessPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Process Payroll                                             │
├─────────────────────────────────────────────────────────────┤
│ Month: [February ▼]  Year: [2025 ▼]                        │
│ Department: [All Departments ▼]                             │
│                                                             │
│ [Process Payroll]                                           │
├─────────────────────────────────────────────────────────────┤
│ Preview (156 employees)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Employee      │ Base    │ Allow.  │ Deduct. │ Net      │ │
│ ├───────────────┼─────────┼─────────┼─────────┼──────────┤ │
│ │ Ahmed Mohamed │ $1,500  │ $225    │ $120    │ $1,605   │ │
│ │ Fatima Ali    │ $2,000  │ $300    │ $160    │ $2,140   │ │
│ │ Hassan Omar   │ $1,200  │ $180    │ $96     │ $1,284   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Total: $185,450                                             │
│                                                             │
│ [Cancel]                                [Confirm & Process] │
└─────────────────────────────────────────────────────────────┘
```

**PayrollListPage.tsx:**
- List processed payrolls
- Filter by month/year/status
- Bulk approve/mark paid

**PayslipPage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│                    HORMUUD UNIVERSITY                       │
│                        PAYSLIP                              │
│                     February 2025                           │
├─────────────────────────────────────────────────────────────┤
│ Employee: Ahmed Mohamed Ali                                 │
│ Employee ID: EMP/2025/001                                  │
│ Department: Computer Science                                │
│ Position: Senior Lecturer                                   │
├─────────────────────────────────────────────────────────────┤
│ EARNINGS                        │ DEDUCTIONS                │
│ ─────────────────────────────── │ ─────────────────────────│
│ Basic Salary      $1,500.00     │ Tax (5%)       $86.25    │
│ Housing (15%)       $225.00     │ Pension (3%)   $51.75    │
│ Transport           $50.00      │                          │
│ ─────────────────────────────── │ ─────────────────────────│
│ Gross:           $1,775.00      │ Total:        $138.00    │
├─────────────────────────────────────────────────────────────┤
│ NET SALARY:                                    $1,637.00    │
├─────────────────────────────────────────────────────────────┤
│ Payment Method: Bank Transfer                               │
│ Bank: Dahabshiil Bank                                      │
│ Account: ****5678                                          │
└─────────────────────────────────────────────────────────────┘
```

**SalaryComponentsPage.tsx:**
- Manage allowances and deductions
- Set default values
- Assign to employees

### 3. Employee Self-Service (src/pages/employee/)

**MyLeavePage.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Leave                                   [Request Leave]  │
├─────────────────────────────────────────────────────────────┤
│ Leave Balances (2025)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Annual Leave    │ ████████░░░░ │ 16/21 days available  │ │
│ │ Sick Leave      │ ████████████ │ 14/14 days available  │ │
│ │ Unpaid Leave    │ ████████████ │ 30/30 days available  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ My Requests                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Feb 20-25 │ Annual │ 5 days │ Pending   │ [Cancel]     │ │
│ │ Jan 10-12 │ Sick   │ 2 days │ Approved  │              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**LeaveRequestForm.tsx:**
```
┌─────────────────────────────────────────────────────────────┐
│ Request Leave                                               │
├─────────────────────────────────────────────────────────────┤
│ Leave Type: [Annual Leave          ▼]                       │
│             Available: 16 days                              │
│                                                             │
│ Start Date: [Feb 20, 2025  📅]                             │
│ End Date:   [Feb 25, 2025  📅]                             │
│                                                             │
│ Total Days: 5 (excluding weekends)                          │
│                                                             │
│ Reason:                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Family vacation                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☐ Attach supporting document (required for sick leave)     │
│                                                             │
│ Remaining balance after request: 11 days                    │
│                                                             │
│                              [Cancel] [Submit Request]      │
└─────────────────────────────────────────────────────────────┘
```

**MyPayslipsPage.tsx:**
- List of payslips by month
- Download PDF
- View details

### 4. UI Components

**LeaveBalanceCard.tsx:**
```tsx
<LeaveBalanceCard
  type="Annual Leave"
  used={5}
  total={21}
  pending={5}
/>
```

**LeaveStatusBadge.tsx:**
```tsx
<LeaveStatusBadge status="PENDING" />
```

**PayrollStatusBadge.tsx:**
```tsx
<PayrollStatusBadge status="PROCESSED" />
```

**LeaveCalendar.tsx:**
```tsx
<LeaveCalendar
  month={2}
  year={2025}
  leaves={leaveData}
  onDateClick={(date) => viewLeaves(date)}
/>
```

---

## Database Updates

```prisma
model LeaveType {
  id               String         @id @default(uuid())
  name             String
  nameLocal        String?
  daysPerYear      Int
  carryForward     Boolean        @default(false)
  maxCarryDays     Int            @default(0)
  requiresDocument Boolean        @default(false)
  isPaid           Boolean        @default(true)
  isActive         Boolean        @default(true)
  balances         LeaveBalance[]
  requests         LeaveRequest[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model LeaveBalance {
  id             String    @id @default(uuid())
  employeeId     String
  employee       Employee  @relation(fields: [employeeId], references: [id])
  leaveTypeId    String
  leaveType      LeaveType @relation(fields: [leaveTypeId], references: [id])
  year           Int
  allocated      Int
  used           Int       @default(0)
  carriedForward Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@unique([employeeId, leaveTypeId, year])
}

model LeaveRequest {
  id              String      @id @default(uuid())
  employeeId      String
  employee        Employee    @relation(fields: [employeeId], references: [id])
  leaveTypeId     String
  leaveType       LeaveType   @relation(fields: [leaveTypeId], references: [id])
  startDate       DateTime    @db.Date
  endDate         DateTime    @db.Date
  totalDays       Int
  reason          String
  documentUrl     String?
  status          LeaveStatus @default(PENDING)
  approverId      String?
  approver        User?       @relation(fields: [approverId], references: [id])
  approverRemarks String?
  approvedAt      DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Payroll {
  id              String        @id @default(uuid())
  employeeId      String
  employee        Employee      @relation(fields: [employeeId], references: [id])
  month           Int
  year            Int
  baseSalary      Decimal
  grossSalary     Decimal
  totalDeductions Decimal
  netSalary       Decimal
  status          PayrollStatus @default(DRAFT)
  processedAt     DateTime?
  approvedById    String?
  approvedBy      User?         @relation(fields: [approvedById], references: [id])
  approvedAt      DateTime?
  paidAt          DateTime?
  items           PayrollItem[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([employeeId, month, year])
}

model PayrollItem {
  id        String   @id @default(uuid())
  payrollId String
  payroll   Payroll  @relation(fields: [payrollId], references: [id])
  name      String
  type      String   // ALLOWANCE or DEDUCTION
  amount    Decimal
}

model SalaryComponent {
  id              String  @id @default(uuid())
  name            String
  type            String  // ALLOWANCE or DEDUCTION
  calculationType String  // FIXED or PERCENTAGE
  defaultValue    Decimal
  isActive        Boolean @default(true)
  appliesToAll    Boolean @default(false)
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PayrollStatus {
  DRAFT
  PROCESSED
  APPROVED
  PAID
}
```

---

## Validation Checklist

- [ ] Leave types can be configured
- [ ] Leave balances show correctly
- [ ] Employee can submit leave request
- [ ] Business days calculated correctly (excludes weekends)
- [ ] Document required for sick leave
- [ ] Supervisor can approve/reject
- [ ] Balance deducted on approval
- [ ] Leave calendar shows all leaves
- [ ] Payroll can be processed for month
- [ ] Allowances and deductions calculate correctly
- [ ] Net salary = Gross - Deductions
- [ ] Payslip PDF generates correctly
- [ ] Employee can view own payslips
- [ ] Bank file can be exported
- [ ] Payroll report generates
- [ ] Year-end leave carry forward works
