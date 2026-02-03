# Prompt 22: Advanced Finance Features

## Objective
Implement scholarships, fee waivers, payment plans, refunds, and budget management.

## Location: `hums-v2-project/prompts/22-advanced-finance.md`

---

## Backend Implementation

### 1. Scholarship Service (src/services/scholarship.service.ts)
```typescript
interface Scholarship {
  id: string;
  name: string;
  description: string;
  type: ScholarshipType;
  amount: Decimal;
  amountType: 'FIXED' | 'PERCENTAGE';
  criteria: ScholarshipCriteria;
  maxRecipients?: number;
  academicYear: string;
  applicationDeadline?: DateTime;
  isActive: boolean;
}

enum ScholarshipType {
  MERIT = 'MERIT',
  NEED_BASED = 'NEED_BASED',
  ATHLETIC = 'ATHLETIC',
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  EXTERNAL = 'EXTERNAL'
}

interface ScholarshipCriteria {
  minGPA?: number;
  maxIncome?: number;
  programs?: string[];
  yearOfStudy?: number[];
}

interface ScholarshipAward {
  id: string;
  scholarshipId: string;
  studentId: string;
  academicYear: string;
  amount: Decimal;
  status: 'PENDING' | 'APPROVED' | 'APPLIED' | 'REVOKED';
  appliedToInvoice?: string;
  awardedById: string;
  awardedAt: DateTime;
}

// Management
createScholarship(data: CreateScholarshipDto): Scholarship
getScholarships(filters?: ScholarshipFilters): Scholarship[]
updateScholarship(id: string, data: UpdateDto): Scholarship

// Awards
awardScholarship(studentId: string, scholarshipId: string, amount: Decimal): ScholarshipAward
getStudentScholarships(studentId: string): ScholarshipAward[]
applyToInvoice(awardId: string, invoiceId: string): void
revokeAward(awardId: string, reason: string): void

// Eligibility
checkEligibility(studentId: string, scholarshipId: string): EligibilityResult
getEligibleStudents(scholarshipId: string): Student[]
```

### 2. Fee Waiver Service (src/services/feeWaiver.service.ts)
```typescript
interface FeeWaiver {
  id: string;
  studentId: string;
  type: WaiverType;
  amount: Decimal;
  amountType: 'FIXED' | 'PERCENTAGE';
  reason: string;
  supportingDocs?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  approvedById?: string;
  validFrom: DateTime;
  validTo: DateTime;
}

enum WaiverType {
  SIBLING_DISCOUNT = 'SIBLING_DISCOUNT',
  STAFF_DEPENDENT = 'STAFF_DEPENDENT',
  FINANCIAL_HARDSHIP = 'FINANCIAL_HARDSHIP',
  ACADEMIC_EXCELLENCE = 'ACADEMIC_EXCELLENCE',
  OTHER = 'OTHER'
}

requestWaiver(studentId: string, data: CreateWaiverDto): FeeWaiver
approveWaiver(waiverId: string, approvedById: string): void
rejectWaiver(waiverId: string, reason: string): void
applyWaiverToInvoice(waiverId: string, invoiceId: string): void
getStudentWaivers(studentId: string): FeeWaiver[]
getPendingWaivers(): FeeWaiver[]
```

### 3. Payment Plan Service (src/services/paymentPlan.service.ts)
```typescript
interface PaymentPlan {
  id: string;
  studentId: string;
  invoiceId: string;
  totalAmount: Decimal;
  downPayment: Decimal;
  numberOfInstallments: number;
  installmentAmount: Decimal;
  startDate: DateTime;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
  installments: Installment[];
  lateFeePercentage: Decimal;
}

interface Installment {
  id: string;
  planId: string;
  number: number;
  amount: Decimal;
  dueDate: DateTime;
  paidAmount: Decimal;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  lateFee: Decimal;
}

createPaymentPlan(data: {
  studentId: string;
  invoiceId: string;
  downPayment: Decimal;
  numberOfInstallments: number;
  startDate: DateTime;
}): PaymentPlan

getStudentPlans(studentId: string): PaymentPlan[]
recordInstallmentPayment(installmentId: string, amount: Decimal): void
getOverdueInstallments(): Installment[]
calculateLateFees(): void  // Cron job - runs weekly
markPlanDefaulted(planId: string): void
```

### 4. Refund Service (src/services/refund.service.ts)
```typescript
interface RefundRequest {
  id: string;
  studentId: string;
  paymentId: string;
  amount: Decimal;
  reason: RefundReason;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  approvedById?: string;
  processedById?: string;
  refundMethod?: string;
  refundReference?: string;
}

enum RefundReason {
  WITHDRAWAL = 'WITHDRAWAL',
  OVERPAYMENT = 'OVERPAYMENT',
  COURSE_CANCELLATION = 'COURSE_CANCELLATION',
  FEE_ADJUSTMENT = 'FEE_ADJUSTMENT',
  OTHER = 'OTHER'
}

requestRefund(data: CreateRefundDto): RefundRequest
approveRefund(refundId: string, approvedById: string): void
rejectRefund(refundId: string, reason: string): void
processRefund(refundId: string, reference: string): void
getRefundRequests(filters?: RefundFilters): RefundRequest[]
```

### 5. Budget Service (src/services/budget.service.ts)
```typescript
interface Budget {
  id: string;
  name: string;
  departmentId?: string;
  fiscalYear: string;
  totalAmount: Decimal;
  allocatedAmount: Decimal;
  spentAmount: Decimal;
  remainingAmount: Decimal;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  categories: BudgetCategory[];
}

createBudget(data: CreateBudgetDto): Budget
allocateToCategory(budgetId: string, category: string, amount: Decimal): void
recordExpense(data: CreateExpenseDto): BudgetExpense
getBudgetVsActual(budgetId: string): BudgetReport
transferBetweenCategories(fromId: string, toId: string, amount: Decimal): void
```

### 6. API Routes

**Scholarships:**
```
GET    /api/v1/scholarships
POST   /api/v1/scholarships
GET    /api/v1/scholarships/:id
PATCH  /api/v1/scholarships/:id
POST   /api/v1/scholarships/:id/award
GET    /api/v1/scholarships/:id/eligible-students
GET    /api/v1/students/:id/scholarships
POST   /api/v1/scholarship-awards/:id/apply-to-invoice
POST   /api/v1/scholarship-awards/:id/revoke
```

**Fee Waivers:**
```
GET    /api/v1/fee-waivers
POST   /api/v1/fee-waivers
GET    /api/v1/fee-waivers/:id
POST   /api/v1/fee-waivers/:id/approve
POST   /api/v1/fee-waivers/:id/reject
GET    /api/v1/fee-waivers/pending
GET    /api/v1/students/:id/fee-waivers
```

**Payment Plans:**
```
GET    /api/v1/payment-plans
POST   /api/v1/payment-plans
GET    /api/v1/payment-plans/:id
POST   /api/v1/payment-plans/:id/pay-installment
GET    /api/v1/payment-plans/overdue
GET    /api/v1/students/:id/payment-plans
```

**Refunds:**
```
GET    /api/v1/refunds
POST   /api/v1/refunds
GET    /api/v1/refunds/:id
POST   /api/v1/refunds/:id/approve
POST   /api/v1/refunds/:id/reject
POST   /api/v1/refunds/:id/process
```

**Budgets:**
```
GET    /api/v1/budgets
POST   /api/v1/budgets
GET    /api/v1/budgets/:id
POST   /api/v1/budgets/:id/expenses
GET    /api/v1/budgets/:id/report
POST   /api/v1/budgets/:id/transfer
```

---

## Frontend Implementation

### 1. Scholarship Management (src/pages/finance/ScholarshipsPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Scholarships                               [+ Create New]   │
├─────────────────────────────────────────────────────────────┤
│ Name              │ Type    │ Amount │ Recipients │ Status │
│───────────────────┼─────────┼────────┼────────────┼────────│
│ Merit Scholarship │ Merit   │ 50%    │ 45/50      │ Active │
│ Need-Based Grant  │ Need    │ $500   │ 30/30      │ Full   │
│ Full Ride         │ Full    │ 100%   │ 5/5        │ Full   │
│                                       [View] [Award] [Edit] │
└─────────────────────────────────────────────────────────────┘
```

### 2. Payment Plan Creation
```
┌─────────────────────────────────────────────────────────────┐
│ Create Payment Plan                                         │
├─────────────────────────────────────────────────────────────┤
│ Student: Ahmed Mohamed | Invoice: INV-2025-000123          │
│ Total Due: $1,500.00                                       │
├─────────────────────────────────────────────────────────────┤
│ Down Payment:  [$300.00    ] (Min 20%: $300)              │
│ Installments:  [4 ▼]                                       │
│ Start Date:    [Mar 1, 2025 📅]                           │
├─────────────────────────────────────────────────────────────┤
│ Schedule Preview                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Down Payment │ Today       │ $300.00                   │ │
│ │ Installment 1│ Mar 1, 2025 │ $300.00                   │ │
│ │ Installment 2│ Apr 1, 2025 │ $300.00                   │ │
│ │ Installment 3│ May 1, 2025 │ $300.00                   │ │
│ │ Installment 4│ Jun 1, 2025 │ $300.00                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Late fee: 2% per week                                       │
│                              [Cancel] [Create Plan]         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Budget Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ Budget: CS Department - FY 2025-2026                       │
├─────────────────────────────────────────────────────────────┤
│ Total: $50,000   Spent: $32,500   Remaining: $17,500       │
│ ████████████████████░░░░░░░░░░ 65%                         │
├─────────────────────────────────────────────────────────────┤
│ Category      │ Allocated │ Spent    │ Remaining │ %      │
│───────────────┼───────────┼──────────┼───────────┼────────│
│ Equipment     │ $20,000   │ $15,000  │ $5,000    │ 75%    │
│ Supplies      │ $10,000   │ $8,500   │ $1,500    │ 85%    │
│ Travel        │ $5,000    │ $2,000   │ $3,000    │ 40%    │
│ Training      │ $8,000    │ $4,000   │ $4,000    │ 50%    │
├─────────────────────────────────────────────────────────────┤
│ [+ Record Expense] [Transfer Funds] [View Report]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Models

```prisma
model Scholarship {
  id                  String             @id @default(uuid())
  name                String
  description         String?
  type                ScholarshipType
  amount              Decimal
  amountType          String
  criteria            Json?
  maxRecipients       Int?
  academicYear        String
  isActive            Boolean            @default(true)
  awards              ScholarshipAward[]
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
}

model ScholarshipAward {
  id               String      @id @default(uuid())
  scholarshipId    String
  scholarship      Scholarship @relation(fields: [scholarshipId], references: [id])
  studentId        String
  student          Student     @relation(fields: [studentId], references: [id])
  amount           Decimal
  status           String      @default("PENDING")
  appliedToInvoice String?
  awardedById      String
  awardedAt        DateTime    @default(now())
}

model FeeWaiver {
  id             String   @id @default(uuid())
  studentId      String
  student        Student  @relation(fields: [studentId], references: [id])
  type           String
  amount         Decimal
  amountType     String
  reason         String
  status         String   @default("PENDING")
  approvedById   String?
  validFrom      DateTime
  validTo        DateTime
  createdAt      DateTime @default(now())
}

model PaymentPlan {
  id                   String        @id @default(uuid())
  studentId            String
  student              Student       @relation(fields: [studentId], references: [id])
  invoiceId            String
  totalAmount          Decimal
  downPayment          Decimal
  numberOfInstallments Int
  status               String        @default("ACTIVE")
  lateFeePercentage    Decimal       @default(2)
  installments         Installment[]
  createdAt            DateTime      @default(now())
}

model Installment {
  id         String      @id @default(uuid())
  planId     String
  plan       PaymentPlan @relation(fields: [planId], references: [id])
  number     Int
  amount     Decimal
  dueDate    DateTime
  paidAmount Decimal     @default(0)
  status     String      @default("PENDING")
  lateFee    Decimal     @default(0)
}

model RefundRequest {
  id              String   @id @default(uuid())
  studentId       String
  paymentId       String
  amount          Decimal
  reason          String
  status          String   @default("PENDING")
  refundReference String?
  processedAt     DateTime?
  createdAt       DateTime @default(now())
}

model Budget {
  id           String           @id @default(uuid())
  name         String
  departmentId String?
  fiscalYear   String
  totalAmount  Decimal
  status       String           @default("ACTIVE")
  categories   BudgetCategory[]
  createdAt    DateTime         @default(now())
}

model BudgetCategory {
  id              String          @id @default(uuid())
  budgetId        String
  budget          Budget          @relation(fields: [budgetId], references: [id])
  name            String
  allocatedAmount Decimal
  expenses        BudgetExpense[]
}

model BudgetExpense {
  id          String         @id @default(uuid())
  categoryId  String
  category    BudgetCategory @relation(fields: [categoryId], references: [id])
  amount      Decimal
  description String
  date        DateTime       @default(now())
}

enum ScholarshipType {
  MERIT
  NEED_BASED
  ATHLETIC
  FULL
  PARTIAL
  EXTERNAL
}
```

---

## Validation Checklist

- [ ] Scholarships created with criteria
- [ ] Eligibility checking works (GPA, program)
- [ ] Students can be awarded scholarships
- [ ] Award applies to invoice correctly
- [ ] Fee waivers can be requested
- [ ] Waiver approval/rejection workflow
- [ ] Payment plans can be created
- [ ] Down payment minimum enforced
- [ ] Installments generate correctly
- [ ] Late fees calculate on overdue
- [ ] Refund request workflow works
- [ ] Refund processed with reference
- [ ] Budget categories allocated
- [ ] Expenses track against budget
- [ ] Budget vs actual report works
