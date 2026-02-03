# Prompt 19: Book Borrowing & Returns

## Objective
Implement the complete book borrowing, returns, reservations, and fine management system.

## Location in Project
Place this file in: `hums-v2-project/prompts/19-book-borrowing.md`

---

## Backend Implementation

### 1. Borrowing Service (src/services/borrowing.service.ts)
```typescript
interface Borrowing {
  id: string;
  bookCopyId: string;
  borrowerId: string;
  borrowerType: 'STUDENT' | 'EMPLOYEE';
  borrowDate: DateTime;
  dueDate: DateTime;
  returnDate?: DateTime;
  renewCount: number;
  status: BorrowingStatus;
  lateFee?: Decimal;
  lateFeeStatus?: 'PENDING' | 'PAID' | 'WAIVED';
  issuedById: string;
  returnedToId?: string;
}

enum BorrowingStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  LOST = 'LOST'
}

// Borrowing config
const config = {
  studentMaxBooks: 5,
  employeeMaxBooks: 10,
  loanPeriodDays: 14,
  maxRenewals: 2,
  lateFeePerDay: 0.50,  // USD
  gracePeriodDays: 1
};

// Issue book
issueBook(data: {
  bookCopyId: string;      // or barcode
  borrowerId: string;
  borrowerType: 'STUDENT' | 'EMPLOYEE';
}): Borrowing

// Return book
returnBook(borrowingId: string, returnedToId: string): Borrowing
returnByBarcode(barcode: string, returnedToId: string): Borrowing

// Renew
renewBook(borrowingId: string): Borrowing
canRenew(borrowingId: string): { canRenew: boolean; reason?: string }

// Queries
getBorrowings(filters: BorrowingFilters, pagination): Borrowing[]
getActiveBorrowings(borrowerId: string): Borrowing[]
getOverdueBorrowings(): Borrowing[]
getBorrowingHistory(borrowerId: string): Borrowing[]
getBorrowingsByBook(bookId: string): Borrowing[]

// Validations
canBorrow(borrowerId: string): { canBorrow: boolean; reason?: string }
checkBorrowingLimit(borrowerId: string, borrowerType: string): boolean
hasOverdueBooks(borrowerId: string): boolean

// Late fees
calculateLateFee(borrowingId: string): Decimal
waiveLateFee(borrowingId: string, waivedById: string, reason: string): void
payLateFee(borrowingId: string, amount: Decimal): void
```

### 2. Reservation Service (src/services/reservation.service.ts)
```typescript
interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  reservedAt: DateTime;
  expiresAt: DateTime;
  status: ReservationStatus;
  notifiedAt?: DateTime;
  fulfilledAt?: DateTime;
}

enum ReservationStatus {
  PENDING = 'PENDING',
  READY = 'READY',        // Book available for pickup
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// Reserve book
reserveBook(bookId: string, userId: string): Reservation
cancelReservation(reservationId: string): void

// Queries
getReservations(filters: ReservationFilters): Reservation[]
getUserReservations(userId: string): Reservation[]
getBookReservations(bookId: string): Reservation[]
getReadyForPickup(): Reservation[]

// Processing
processReservationQueue(bookId: string): void  // Called when book returned
notifyReservationReady(reservationId: string): void
expireOldReservations(): void  // Cron job
```

### 3. Library Member Service (src/services/libraryMember.service.ts)
```typescript
interface LibraryMember {
  userId: string;
  memberType: 'STUDENT' | 'EMPLOYEE';
  cardNumber: string;
  cardIssuedAt: DateTime;
  cardExpiresAt: DateTime;
  isActive: boolean;
  maxBooks: number;
  currentBorrowings: number;
  totalBorrowings: number;
  totalFines: Decimal;
  unpaidFines: Decimal;
}

getMember(userId: string): LibraryMember
getMemberByCard(cardNumber: string): LibraryMember
issueLibraryCard(userId: string, memberType: string): LibraryMember
renewLibraryCard(userId: string): LibraryMember
suspendMember(userId: string, reason: string): void
getMemberStats(userId: string): MemberStats
```

### 4. API Routes

**Borrowings:**
```
GET    /api/v1/library/borrowings
POST   /api/v1/library/borrowings/issue
POST   /api/v1/library/borrowings/:id/return
POST   /api/v1/library/borrowings/:id/renew
POST   /api/v1/library/borrowings/return-by-barcode
GET    /api/v1/library/borrowings/:id
GET    /api/v1/library/borrowings/overdue
GET    /api/v1/library/borrowings/member/:memberId
GET    /api/v1/library/borrowings/book/:bookId
POST   /api/v1/library/borrowings/:id/waive-fee
POST   /api/v1/library/borrowings/:id/pay-fee
```

**Reservations:**
```
GET    /api/v1/library/reservations
POST   /api/v1/library/reservations
DELETE /api/v1/library/reservations/:id
GET    /api/v1/library/reservations/my
GET    /api/v1/library/reservations/ready-for-pickup
```

**Members:**
```
GET    /api/v1/library/members
GET    /api/v1/library/members/:id
GET    /api/v1/library/members/card/:cardNumber
POST   /api/v1/library/members/:id/issue-card
POST   /api/v1/library/members/:id/suspend
```

**Student/Employee Self-Service:**
```
GET    /api/v1/student/library/borrowings
GET    /api/v1/student/library/history
POST   /api/v1/student/library/renew/:borrowingId
GET    /api/v1/student/library/reservations
POST   /api/v1/student/library/reserve/:bookId
GET    /api/v1/student/library/fines
```

---

## Frontend Implementation

### 1. Issue Book Page (src/pages/library/IssueBookPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Issue Book                                                  │
├─────────────────────────────────────────────────────────────┤
│ Member                                                      │
│ Card/ID: [________________] [🔍 Search] or [📷 Scan]       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 Ahmed Mohamed Ali                                    │ │
│ │    Student ID: HU/2025/0001                            │ │
│ │    Card: LIB-MEM-001234                                │ │
│ │    Books: 2/5 borrowed | Fines: $0.00                  │ │
│ │    Status: ✓ Can borrow                                │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Book                                                        │
│ Barcode/ISBN: [________________] [🔍] or [📷 Scan]         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📚 Introduction to Algorithms                           │ │
│ │    Copy #: 003 | Barcode: LIB-001236                   │ │
│ │    Condition: Good | Location: Main Library, A1        │ │
│ │    Status: ✓ Available                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Loan Period: 14 days                                        │
│ Due Date: March 1, 2025                                     │
│                                                             │
│                              [Cancel] [Issue Book]          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Return Book Page (src/pages/library/ReturnBookPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Return Book                                                 │
├─────────────────────────────────────────────────────────────┤
│ Scan Barcode: [________________] [📷 Scan]                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📚 Introduction to Algorithms                           │ │
│ │    Barcode: LIB-001236                                 │ │
│ │    Borrowed by: Ahmed Mohamed (HU/2025/0001)           │ │
│ │    Borrowed: Feb 15, 2025                              │ │
│ │    Due: March 1, 2025                                  │ │
│ │    Status: ⚠️ OVERDUE (5 days)                         │ │
│ │    Late Fee: $2.50                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Book Condition: [Good ▼]                                   │
│ Notes: [________________________]                          │
│                                                             │
│ ☐ Waive late fee (requires reason)                         │
│   Reason: [________________________]                       │
│                                                             │
│                              [Cancel] [Process Return]      │
├─────────────────────────────────────────────────────────────┤
│ Recently Returned                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 10:30 │ "Java Programming" │ Fatima Ali │ On time      │ │
│ │ 10:25 │ "Database Systems" │ Hassan Omar│ +$1.00 fee   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3. Overdue Books Page (src/pages/library/OverdueBooksPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Overdue Books (12)                          [Send Reminders]│
├─────────────────────────────────────────────────────────────┤
│ Book            │ Borrower      │ Due Date │ Days  │ Fee   │
│─────────────────┼───────────────┼──────────┼───────┼───────│
│ Algorithms      │ Ahmed Mohamed │ Feb 10   │  5    │ $2.50 │
│ Database Sys    │ Hassan Omar   │ Feb 12   │  3    │ $1.50 │
│ Java Guide      │ Amina Yusuf   │ Feb 14   │  1    │ $0.50 │
│ ...             │               │          │       │       │
├─────────────────────────────────────────────────────────────┤
│ Total Outstanding Fees: $45.00                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Member Borrowing History (src/pages/library/MemberHistoryPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Member: Ahmed Mohamed Ali (HU/2025/0001)                    │
├─────────────────────────────────────────────────────────────┤
│ Summary                                                     │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│ │ Currently │ │ Total     │ │ Returned  │ │ Unpaid    │    │
│ │ Borrowed  │ │ Borrowed  │ │ Late      │ │ Fines     │    │
│ │     2     │ │    45     │ │     3     │ │  $0.00    │    │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Current Borrowings                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Algorithms       │ Feb 15 │ Due: Mar 1 │ [Renew]       │ │
│ │ Data Structures  │ Feb 18 │ Due: Mar 4 │ [Renew]       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ History                                    [Filter ▼]       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Java Programming │ Jan 10 - Jan 24 │ Returned on time  │ │
│ │ Python Basics    │ Dec 5 - Dec 20  │ Returned +1 day   │ │
│ │ ...              │                 │                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5. Student Library View (src/pages/student/StudentLibraryPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ My Library                                                  │
├─────────────────────────────────────────────────────────────┤
│ Library Card: LIB-MEM-001234    Books: 2/5                 │
├─────────────────────────────────────────────────────────────┤
│ Current Borrowings                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📚 Introduction to Algorithms                           │ │
│ │    Due: March 1, 2025 (14 days remaining)              │ │
│ │    [Renew] (1 renewal remaining)                       │ │
│ │                                                         │ │
│ │ 📚 Data Structures in Java                              │ │
│ │    Due: March 4, 2025 (17 days remaining)              │ │
│ │    [Renew] (2 renewals remaining)                      │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ My Reservations (1)                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📚 Clean Code                                           │ │
│ │    Position in queue: 2                                │ │
│ │    [Cancel Reservation]                                │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Search Library Catalog]                                │
└─────────────────────────────────────────────────────────────┘
```

### 6. UI Components

**BorrowingStatusBadge.tsx:**
```tsx
<BorrowingStatusBadge status="OVERDUE" daysOverdue={5} />
```

**DueDateDisplay.tsx:**
```tsx
<DueDateDisplay dueDate={date} showCountdown={true} />
// Shows: "Due in 5 days" or "Overdue by 3 days"
```

**MemberCard.tsx:**
```tsx
<MemberCard
  member={member}
  showBorrowings={true}
  showFines={true}
/>
```

**QuickScanInput.tsx:**
```tsx
<QuickScanInput
  placeholder="Scan barcode..."
  onScan={(barcode) => processBarcode(barcode)}
  enableCamera={true}
/>
```

---

## Database Models

```prisma
model Borrowing {
  id            String          @id @default(uuid())
  bookCopyId    String
  bookCopy      BookCopy        @relation(fields: [bookCopyId], references: [id])
  borrowerId    String
  borrower      User            @relation(fields: [borrowerId], references: [id])
  borrowerType  String          // STUDENT or EMPLOYEE
  borrowDate    DateTime        @default(now())
  dueDate       DateTime
  returnDate    DateTime?
  renewCount    Int             @default(0)
  status        BorrowingStatus @default(ACTIVE)
  lateFee       Decimal?
  lateFeeStatus String?         // PENDING, PAID, WAIVED
  issuedById    String
  issuedBy      User            @relation("BorrowingIssuer", fields: [issuedById], references: [id])
  returnedToId  String?
  returnedTo    User?           @relation("BorrowingReceiver", fields: [returnedToId], references: [id])
  waivedById    String?
  waiveReason   String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  @@index([borrowerId])
  @@index([status])
  @@index([dueDate])
}

model Reservation {
  id          String            @id @default(uuid())
  bookId      String
  book        Book              @relation(fields: [bookId], references: [id])
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  reservedAt  DateTime          @default(now())
  expiresAt   DateTime
  status      ReservationStatus @default(PENDING)
  notifiedAt  DateTime?
  fulfilledAt DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  @@index([bookId, status])
  @@index([userId])
}

model LibraryCard {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  cardNumber  String   @unique
  memberType  String   // STUDENT or EMPLOYEE
  issuedAt    DateTime @default(now())
  expiresAt   DateTime
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum BorrowingStatus {
  ACTIVE
  RETURNED
  OVERDUE
  LOST
}

enum ReservationStatus {
  PENDING
  READY
  FULFILLED
  EXPIRED
  CANCELLED
}
```

---

## Background Jobs (Cron)

```typescript
// Run daily at midnight
@Cron('0 0 * * *')
async processOverdueBooks() {
  // 1. Mark overdue borrowings
  // 2. Calculate late fees
  // 3. Send overdue notifications
}

// Run every hour
@Cron('0 * * * *')
async processReservations() {
  // 1. Expire old reservations (48 hours after ready)
  // 2. Notify next in queue when book returned
}
```

---

## Validation Checklist

- [ ] Can issue book with member card/barcode
- [ ] Validates borrowing limit
- [ ] Blocks if member has overdue books
- [ ] Due date calculated correctly
- [ ] Book copy status updates to BORROWED
- [ ] Can return book by scanning barcode
- [ ] Late fee calculated correctly
- [ ] Late fee can be waived with reason
- [ ] Book can be renewed (max 2 times)
- [ ] Cannot renew if overdue
- [ ] Cannot renew if reserved by others
- [ ] Reservations queue works
- [ ] Notification sent when reservation ready
- [ ] Student can see their borrowings
- [ ] Student can renew online
- [ ] Overdue report generates correctly
