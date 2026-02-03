# Prompt 18: Library Catalog & Management

## Objective
Build the library catalog system with book management, categories, and locations.

## Location in Project
Place this file in: `hums-v2-project/prompts/18-library-catalog.md`

---

## Backend Implementation

### 1. Book Category Service (src/services/bookCategory.service.ts)
```typescript
interface BookCategory {
  id: string;
  name: string;
  nameLocal: string;       // Somali
  code: string;            // e.g., "CS", "BUS", "MED"
  parentId?: string;       // For subcategories
  description?: string;
  bookCount: number;       // Computed
}

getCategories(): BookCategory[]
getCategoryTree(): CategoryTreeNode[]
createCategory(data: CreateCategoryDto): BookCategory
updateCategory(id: string, data: UpdateCategoryDto): BookCategory
deleteCategory(id: string): void  // Only if no books
```

### 2. Library Location Service (src/services/libraryLocation.service.ts)
```typescript
interface LibraryLocation {
  id: string;
  name: string;            // e.g., "Main Library", "CS Reading Room"
  building: string;
  floor: string;
  section: string;         // e.g., "A1", "B2"
  capacity: number;        // Shelf capacity
  isActive: boolean;
}

getLocations(): LibraryLocation[]
createLocation(data: CreateLocationDto): LibraryLocation
updateLocation(id: string, data: UpdateLocationDto): LibraryLocation
deleteLocation(id: string): void
```

### 3. Book Service (src/services/book.service.ts)
```typescript
interface Book {
  id: string;
  isbn: string;
  title: string;
  titleLocal?: string;
  author: string;
  coAuthors?: string[];
  publisher: string;
  publishYear: number;
  edition?: string;
  language: string;
  pages?: number;
  categoryId: string;
  locationId: string;
  shelfNumber: string;
  totalCopies: number;
  availableCopies: number;  // Computed
  coverImage?: string;
  description?: string;
  tags: string[];
  status: BookStatus;
}

enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  LOW_STOCK = 'LOW_STOCK',    // < 2 available
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED'
}

// CRUD
createBook(data: CreateBookDto): Book
getBooks(filters: BookFilters, pagination): Book[]
getBookById(id: string): Book
getBookByISBN(isbn: string): Book
updateBook(id: string, data: UpdateBookDto): Book
deleteBook(id: string): void  // Only if no active borrowings

// Search
searchBooks(query: string, filters?: BookFilters): Book[]
getBooksByCategory(categoryId: string): Book[]
getBooksByAuthor(author: string): Book[]
getNewArrivals(limit: number): Book[]
getPopularBooks(limit: number): Book[]

// Inventory
addCopies(bookId: string, quantity: number): void
removeCopies(bookId: string, quantity: number, reason: string): void
getInventoryReport(): InventoryReport
getLowStockBooks(): Book[]
```

### 4. Book Copy Service (src/services/bookCopy.service.ts)
```typescript
interface BookCopy {
  id: string;
  bookId: string;
  copyNumber: string;      // e.g., "001", "002"
  barcode: string;         // Unique barcode
  condition: CopyCondition;
  status: CopyStatus;
  acquisitionDate: DateTime;
  acquisitionType: 'PURCHASE' | 'DONATION' | 'TRANSFER';
  notes?: string;
}

enum CopyCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED'
}

enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
  RETIRED = 'RETIRED'
}

getBookCopies(bookId: string): BookCopy[]
getCopyByBarcode(barcode: string): BookCopy
addCopy(bookId: string, data: CreateCopyDto): BookCopy
updateCopyStatus(copyId: string, status: CopyStatus): void
updateCopyCondition(copyId: string, condition: CopyCondition): void
markAsLost(copyId: string, borrowingId?: string): void
```

### 5. API Routes

**Categories:**
```
GET    /api/v1/library/categories
POST   /api/v1/library/categories
GET    /api/v1/library/categories/:id
PATCH  /api/v1/library/categories/:id
DELETE /api/v1/library/categories/:id
GET    /api/v1/library/categories/tree
```

**Locations:**
```
GET    /api/v1/library/locations
POST   /api/v1/library/locations
GET    /api/v1/library/locations/:id
PATCH  /api/v1/library/locations/:id
DELETE /api/v1/library/locations/:id
```

**Books:**
```
GET    /api/v1/library/books
POST   /api/v1/library/books
GET    /api/v1/library/books/:id
PATCH  /api/v1/library/books/:id
DELETE /api/v1/library/books/:id
GET    /api/v1/library/books/search?q=
GET    /api/v1/library/books/isbn/:isbn
GET    /api/v1/library/books/new-arrivals
GET    /api/v1/library/books/popular
GET    /api/v1/library/books/low-stock
POST   /api/v1/library/books/:id/add-copies
POST   /api/v1/library/books/:id/remove-copies
```

**Book Copies:**
```
GET    /api/v1/library/books/:id/copies
POST   /api/v1/library/books/:id/copies
GET    /api/v1/library/copies/:id
PATCH  /api/v1/library/copies/:id
GET    /api/v1/library/copies/barcode/:barcode
```

---

## Frontend Implementation

### 1. Library Portal Layout (src/layouts/LibraryLayout.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Library Portal                      [🔔] [👤]      │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Dashboard│              Main Content Area                   │
│ Catalog  │                                                  │
│ Borrowing│                                                  │
│ Returns  │                                                  │
│ Members  │                                                  │
│ ──────── │                                                  │
│ Categories│                                                 │
│ Locations│                                                  │
│ Reports  │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### 2. Library Dashboard (src/pages/library/LibraryDashboardPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Library Dashboard                                           │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│ │ Total     │ │ Borrowed  │ │ Overdue   │ │ Reserved  │    │
│ │ Books     │ │  Today    │ │   Items   │ │   Items   │    │
│ │  2,450    │ │    23     │ │    12     │ │     8     │    │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ [🔍 Search Book] [📖 Issue Book] [📥 Return Book] [➕ Add] │
├─────────────────────────────────────────────────────────────┤
│ Recent Activity              │ Low Stock Alert              │
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐│
│ │ Ahmed borrowed "Data..." │ │ │ "Algorithms" - 1 copy    ││
│ │ Fatima returned "Java.." │ │ │ "Database Sys" - 0 copies││
│ │ Book added: "Python..."  │ │ │ "Networks" - 1 copy      ││
│ └──────────────────────────┘ │ └──────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3. Book Catalog (src/pages/library/BookCatalogPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Book Catalog                                    [+ Add Book]│
├─────────────────────────────────────────────────────────────┤
│ Search: [________________________] [🔍]                     │
│ Category: [All ▼] Location: [All ▼] Status: [All ▼]        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [📚]  Introduction to Algorithms                        │ │
│ │       Cormen, Leiserson, Rivest                        │ │
│ │       ISBN: 978-0262033848 | Category: Computer Science│ │
│ │       Location: Main Library, Shelf A1                 │ │
│ │       Copies: 3 available / 5 total     [View] [Edit]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [📚]  Database System Concepts                          │ │
│ │       Silberschatz, Korth, Sudarshan                   │ │
│ │       ISBN: 978-0073523323 | Category: Computer Science│ │
│ │       Location: Main Library, Shelf A2                 │ │
│ │       Copies: 0 available / 3 total  ⚠️  [View] [Edit]  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Showing 1-20 of 2,450 books                 [< 1 2 3 ... >] │
└─────────────────────────────────────────────────────────────┘
```

### 4. Book Detail Page (src/pages/library/BookDetailPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌───────┐  Introduction to Algorithms (3rd Edition)        │
│ │       │  by Cormen, Leiserson, Rivest, Stein            │
│ │ [IMG] │                                                  │
│ │       │  ISBN: 978-0262033848                           │
│ └───────┘  Publisher: MIT Press | Year: 2009              │
│            Category: Computer Science > Algorithms         │
│            Location: Main Library, Section A, Shelf 1     │
├─────────────────────────────────────────────────────────────┤
│ Availability: 3 of 5 copies available                      │
│ [Issue Book]  [Reserve]                                    │
├─────────────────────────────────────────────────────────────┤
│ [Details] [Copies] [History]                               │
├─────────────────────────────────────────────────────────────┤
│ COPIES TAB                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Copy # │ Barcode    │ Condition │ Status    │ Borrower │ │
│ ├────────┼────────────┼───────────┼───────────┼──────────┤ │
│ │ 001    │ LIB-001234 │ Good      │ Available │    -     │ │
│ │ 002    │ LIB-001235 │ Good      │ Borrowed  │ Ahmed M. │ │
│ │ 003    │ LIB-001236 │ Fair      │ Available │    -     │ │
│ │ 004    │ LIB-001237 │ Good      │ Borrowed  │ Fatima A.│ │
│ │ 005    │ LIB-001238 │ Good      │ Available │    -     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5. Add/Edit Book Form (src/pages/library/BookFormPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Add New Book                                                │
├─────────────────────────────────────────────────────────────┤
│ ISBN: [978-0262033848    ] [🔍 Lookup]                     │
│                                                             │
│ Title (English): [Introduction to Algorithms          ]    │
│ Title (Somali):  [                                    ]    │
│                                                             │
│ Author:      [Thomas H. Cormen                        ]    │
│ Co-Authors:  [Leiserson, Rivest, Stein               ]    │
│                                                             │
│ Publisher:   [MIT Press                               ]    │
│ Year:        [2009    ]  Edition: [3rd               ]    │
│ Pages:       [1312    ]  Language: [English        ▼]    │
│                                                             │
│ Category:    [Computer Science > Algorithms         ▼]    │
│ Location:    [Main Library                          ▼]    │
│ Shelf:       [A1                                     ]    │
│                                                             │
│ Cover Image: [📷 Upload]                                   │
│                                                             │
│ Description:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ A comprehensive introduction to algorithms...           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tags: [algorithms] [data structures] [+ Add]               │
│                                                             │
│ Number of Copies: [5]                                       │
│                                                             │
│                              [Cancel] [Save Book]          │
└─────────────────────────────────────────────────────────────┘
```

### 6. UI Components

**BookCard.tsx:**
```tsx
<BookCard
  book={book}
  showAvailability={true}
  actions={['view', 'issue', 'edit']}
/>
```

**BookAvailabilityBadge.tsx:**
```tsx
<BookAvailabilityBadge available={3} total={5} />
// Green if >50%, Yellow if 1-50%, Red if 0
```

**CategoryTree.tsx:**
```tsx
<CategoryTree
  categories={categories}
  selected={selectedId}
  onSelect={(id) => filterByCategory(id)}
/>
```

**ISBNLookup.tsx:**
```tsx
<ISBNLookup
  onFound={(bookData) => populateForm(bookData)}
/>
// Fetches book info from Open Library API
```

**BarcodeScanner.tsx:**
```tsx
<BarcodeScanner
  onScan={(barcode) => findBook(barcode)}
/>
```

---

## Database Models

```prisma
model BookCategory {
  id          String         @id @default(uuid())
  name        String
  nameLocal   String?
  code        String         @unique
  parentId    String?
  parent      BookCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    BookCategory[] @relation("CategoryHierarchy")
  description String?
  books       Book[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model LibraryLocation {
  id        String   @id @default(uuid())
  name      String
  building  String
  floor     String
  section   String
  capacity  Int?
  isActive  Boolean  @default(true)
  books     Book[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Book {
  id             String          @id @default(uuid())
  isbn           String?         @unique
  title          String
  titleLocal     String?
  author         String
  coAuthors      String[]
  publisher      String?
  publishYear    Int?
  edition        String?
  language       String          @default("English")
  pages          Int?
  categoryId     String
  category       BookCategory    @relation(fields: [categoryId], references: [id])
  locationId     String
  location       LibraryLocation @relation(fields: [locationId], references: [id])
  shelfNumber    String?
  coverImage     String?
  description    String?
  tags           String[]
  totalCopies    Int             @default(1)
  copies         BookCopy[]
  borrowings     Borrowing[]
  reservations   Reservation[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?
  
  @@index([title])
  @@index([author])
  @@index([categoryId])
}

model BookCopy {
  id              String        @id @default(uuid())
  bookId          String
  book            Book          @relation(fields: [bookId], references: [id])
  copyNumber      String
  barcode         String        @unique
  condition       CopyCondition @default(GOOD)
  status          CopyStatus    @default(AVAILABLE)
  acquisitionDate DateTime      @default(now())
  acquisitionType String        @default("PURCHASE")
  notes           String?
  borrowings      Borrowing[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([bookId, copyNumber])
}

enum CopyCondition {
  NEW
  GOOD
  FAIR
  POOR
  DAMAGED
}

enum CopyStatus {
  AVAILABLE
  BORROWED
  RESERVED
  MAINTENANCE
  LOST
  RETIRED
}
```

---

## Validation Checklist

- [ ] Categories can be created with hierarchy
- [ ] Locations can be managed
- [ ] Books can be added with all details
- [ ] ISBN lookup populates book data
- [ ] Multiple copies can be added
- [ ] Each copy has unique barcode
- [ ] Book search works (title, author, ISBN)
- [ ] Category filter works
- [ ] Availability shows correctly
- [ ] Low stock alert shows
- [ ] Book cover image uploads
- [ ] Copy status can be updated
- [ ] Barcode scanner finds books
