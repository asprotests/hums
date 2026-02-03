# Prompt 16: HR & Employee Management

## Objective
Build the complete HR portal for employee management, contracts, and document handling.

## Location in Project
Place this file in: `hums-v2-project/prompts/16-hr-employee-management.md`

---

## Backend Implementation

### 1. Employee Service (src/services/employee.service.ts)
```typescript
interface Employee {
  id: string;
  employeeId: string;          // EMP/2025/001
  userId: string;
  departmentId: string;
  position: string;
  employmentType: EmploymentType;
  hireDate: DateTime;
  endDate?: DateTime;
  contractType: ContractType;
  baseSalary: Decimal;
  status: EmployeeStatus;
  supervisorId?: string;
}

enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN'
}

enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  RESIGNED = 'RESIGNED'
}

// Employee CRUD
createEmployee(data: CreateEmployeeDto): Employee
getEmployees(filters: EmployeeFilters, pagination): Employee[]
getEmployeeById(id: string): Employee
updateEmployee(id: string, data: UpdateEmployeeDto): Employee
terminateEmployee(id: string, reason: string, endDate: Date): void

// Organization
getOrganizationChart(departmentId?: string): OrgChartNode[]
getDirectReports(supervisorId: string): Employee[]
transferEmployee(employeeId: string, newDepartmentId: string): void

// Employee ID Generation: EMP/YYYY/NNNN
generateEmployeeId(): string
```

### 2. Contract Service (src/services/contract.service.ts)
```typescript
interface Contract {
  id: string;
  employeeId: string;
  type: ContractType;
  startDate: DateTime;
  endDate?: DateTime;
  salary: Decimal;
  status: ContractStatus;
}

enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

createContract(employeeId: string, data: CreateContractDto): Contract
renewContract(contractId: string, newEndDate: Date): Contract
terminateContract(contractId: string, reason: string): void
getExpiringContracts(daysAhead: number): Contract[]
```

### 3. Onboarding Service (src/services/onboarding.service.ts)
```typescript
interface OnboardingChecklist {
  id: string;
  employeeId: string;
  tasks: OnboardingTask[];
  completedAt?: DateTime;
}

createOnboarding(employeeId: string): OnboardingChecklist
completeTask(taskId: string): void
getPendingOnboardings(): OnboardingChecklist[]
```

### 4. API Routes
```
GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/:id
PATCH  /api/v1/employees/:id
POST   /api/v1/employees/:id/terminate
POST   /api/v1/employees/:id/transfer
GET    /api/v1/employees/:id/contracts
POST   /api/v1/employees/:id/contracts
GET    /api/v1/employees/:id/onboarding
GET    /api/v1/contracts/expiring?days=30
GET    /api/v1/organization-chart
```

---

## Frontend Implementation

### 1. HR Dashboard (src/pages/hr/HRDashboardPage.tsx)
- Total employees count
- On leave today
- New hires this month
- Expiring contracts alerts
- Pending onboardings

### 2. Employee List (src/pages/hr/EmployeeListPage.tsx)
- Search and filter
- Department filter
- Status filter
- Table with pagination

### 3. Employee Profile (src/pages/hr/EmployeeProfilePage.tsx)
Tabs: Personal | Employment | Documents | Contracts | History

### 4. Employee Form (Multi-step)
- Step 1: Personal Information
- Step 2: Employment Details
- Step 3: Emergency Contact & Bank
- Step 4: Documents Upload
- Step 5: Review & Create

### 5. Contract Management
- View contracts
- Renew contract
- Terminate contract
- Expiring contracts alerts

### 6. Onboarding Checklist
- Task list with checkboxes
- Progress indicator
- Due dates

---

## Database Models

```prisma
model Employee {
  id               String         @id @default(uuid())
  employeeId       String         @unique
  userId           String         @unique
  user             User           @relation(fields: [userId], references: [id])
  departmentId     String?
  department       Department?    @relation(fields: [departmentId], references: [id])
  position         String
  employmentType   EmploymentType
  hireDate         DateTime
  endDate          DateTime?
  baseSalary       Decimal
  status           EmployeeStatus @default(ACTIVE)
  supervisorId     String?
  supervisor       Employee?      @relation("Supervisor", fields: [supervisorId], references: [id])
  directReports    Employee[]     @relation("Supervisor")
  contracts        Contract[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model Contract {
  id           String         @id @default(uuid())
  employeeId   String
  employee     Employee       @relation(fields: [employeeId], references: [id])
  startDate    DateTime
  endDate      DateTime?
  salary       Decimal
  status       ContractStatus @default(ACTIVE)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model OnboardingChecklist {
  id          String           @id @default(uuid())
  employeeId  String           @unique
  employee    Employee         @relation(fields: [employeeId], references: [id])
  tasks       OnboardingTask[]
  completedAt DateTime?
  createdAt   DateTime         @default(now())
}

model OnboardingTask {
  id          String              @id @default(uuid())
  checklistId String
  checklist   OnboardingChecklist @relation(fields: [checklistId], references: [id])
  title       String
  isCompleted Boolean             @default(false)
  completedAt DateTime?
  orderIndex  Int
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERN
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  SUSPENDED
  TERMINATED
  RESIGNED
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRED
  TERMINATED
}
```

---

## Validation Checklist
- [ ] Can create new employee
- [ ] Employee ID auto-generates
- [ ] User account created for employee
- [ ] Contracts can be created
- [ ] Contract renewal works
- [ ] Expiring contracts alert shows
- [ ] Onboarding checklist works
- [ ] Employee can be terminated
- [ ] Organization chart displays
- [ ] Search and filter work
