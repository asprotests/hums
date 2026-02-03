# Prompt 07: Finance Portal - Basic

## Objective
Implement fee structures, invoicing, and payment recording.

## Backend Implementation

### 1. Fee Structure Service (src/services/feeStructure.service.ts)
```typescript
createFeeStructure(data: {
  programId: string,
  academicYear: string,
  tuitionFee: number,
  registrationFee: number,
  libraryFee: number,
  labFee?: number,
  otherFees?: { name: string, amount: number }[]
})
getFeeStructures(filters: { programId?, academicYear? })
getFeeStructureById(id)
updateFeeStructure(id, data)
deleteFeeStructure(id)
calculateTotalFee(feeStructureId): number
```

### 2. Invoice Service (src/services/invoice.service.ts)

**Invoice Number Format:** `INV-YYYY-NNNNNN`

```typescript
generateInvoice(studentId: string, semesterId: string)
generateBulkInvoices(semesterId: string, programId?: string)  // Generate for all students
getInvoices(filters: { studentId?, status?, semesterId? }, pagination)
getInvoiceById(id)
getInvoiceByNumber(invoiceNo)
updateInvoiceStatus(id, status)
voidInvoice(id, reason)
getOutstandingInvoices()
getOverdueInvoices()
```

**Invoice Status:** `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`

### 3. Payment Service (src/services/payment.service.ts)

**Receipt Number Format:** `RCP-YYYY-NNNNNN`

```typescript
recordPayment(data: {
  studentId: string,
  invoiceId?: string,  // Optional - can pay without invoice
  amount: number,
  method: PaymentMethod,
  reference?: string,
  notes?: string
})
getPayments(filters: { studentId?, method?, dateFrom?, dateTo? }, pagination)
getPaymentById(id)
getPaymentByReceiptNo(receiptNo)
voidPayment(id, reason)  // Reverse payment
generateReceipt(paymentId): PDF
getDailyCollection(date)
getCollectionReport(dateFrom, dateTo)
```

**Payment Methods:** `CASH`, `BANK_TRANSFER`, `MOBILE_MONEY`, `EVC_PLUS`

### 4. API Routes

**Fee Structures:**
```
GET    /api/v1/fee-structures
POST   /api/v1/fee-structures
GET    /api/v1/fee-structures/:id
PATCH  /api/v1/fee-structures/:id
DELETE /api/v1/fee-structures/:id
GET    /api/v1/fee-structures/program/:programId
```

**Invoices:**
```
GET    /api/v1/invoices
POST   /api/v1/invoices/generate
POST   /api/v1/invoices/generate-bulk
GET    /api/v1/invoices/:id
PATCH  /api/v1/invoices/:id/void
GET    /api/v1/invoices/student/:studentId
GET    /api/v1/invoices/outstanding
GET    /api/v1/invoices/overdue
```

**Payments:**
```
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/:id
GET    /api/v1/payments/:id/receipt
PATCH  /api/v1/payments/:id/void
GET    /api/v1/payments/student/:studentId
```

**Reports:**
```
GET    /api/v1/finance/reports/collection?from=&to=
GET    /api/v1/finance/reports/outstanding
GET    /api/v1/finance/reports/daily-summary?date=
GET    /api/v1/finance/dashboard
```

### 5. Finance Dashboard Data
```typescript
{
  totalCollectedToday: number,
  totalCollectedThisMonth: number,
  totalOutstanding: number,
  totalOverdue: number,
  recentPayments: Payment[],
  collectionByMethod: { method: string, total: number }[],
  overdueByProgram: { program: string, count: number, amount: number }[]
}
```

## Frontend Implementation

### 1. Finance Portal Layout
```
Finance Portal
├── Dashboard
├── Fee Structures
├── Invoices
│   ├── All Invoices
│   ├── Outstanding
│   └── Overdue
├── Payments
│   ├── Record Payment
│   └── Payment History
└── Reports
    ├── Collection Report
    └── Outstanding Report
```

### 2. Finance Pages (src/pages/finance/)
- `FinanceDashboardPage.tsx` - KPIs and charts
- `FeeStructureListPage.tsx` - Manage fee structures
- `FeeStructureFormPage.tsx` - Create/edit
- `InvoiceListPage.tsx` - All invoices with filters
- `InvoiceDetailPage.tsx` - View invoice details
- `PaymentFormPage.tsx` - Record new payment
- `PaymentListPage.tsx` - Payment history
- `PaymentReceiptPage.tsx` - Print receipt
- `CollectionReportPage.tsx` - Collection reports
- `OutstandingReportPage.tsx` - Outstanding balances

### 3. UI Components
- `AmountDisplay` - Format currency (USD)
- `InvoiceStatusBadge` - Color-coded status
- `PaymentMethodIcon` - Icon for each method
- `ReceiptPreview` - Receipt print preview
- `StudentSearch` - Search student by ID or name
- `DateRangePicker` - For reports
- `CollectionChart` - Bar/line chart
- `OutstandingTable` - Sorted by amount/age

### 4. Payment Recording Form
```
1. Search Student (by ID or name)
2. Show student's outstanding balance
3. Show unpaid invoices (optional selection)
4. Enter payment amount
5. Select payment method
6. Enter reference (for non-cash)
7. Add notes (optional)
8. Submit → Generate Receipt
```

### 5. Receipt Design (PDF)
```
┌─────────────────────────────────────┐
│   HORMUUD UNIVERSITY               │
│   Payment Receipt                   │
├─────────────────────────────────────┤
│ Receipt No: RCP-2025-000001        │
│ Date: Feb 15, 2025                 │
├─────────────────────────────────────┤
│ Student: Ahmed Mohamed              │
│ Student ID: HU/2025/0001           │
│ Program: BSc Computer Science      │
├─────────────────────────────────────┤
│ Amount Paid: $500.00               │
│ Payment Method: Cash               │
│ Reference: -                       │
├─────────────────────────────────────┤
│ Outstanding Balance: $1,500.00     │
├─────────────────────────────────────┤
│ Received By: Finance Staff         │
│ Signature: ________________        │
└─────────────────────────────────────┘
```

### 6. Student Portal - Finance Section
- Fee structure display
- Current balance
- Invoice list
- Payment history
- Download receipts

## Business Rules
1. Payment amount cannot exceed outstanding balance (optional)
2. Overdue status: 30 days past due date
3. Cannot void payment older than 7 days without admin approval
4. Receipt number is immutable
5. Voided payments keep receipt number but marked as VOID

## Validation Checklist
- [ ] Can create fee structure per program
- [ ] Invoice generated with correct amount
- [ ] Bulk invoice generation works
- [ ] Can record payment (all methods)
- [ ] Receipt generates as PDF
- [ ] Outstanding balance updates correctly
- [ ] Collection report shows accurate totals
- [ ] Dashboard KPIs are correct
- [ ] Student can view their fees and payments
