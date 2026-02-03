# Prompt 04: RBAC & User Management

## Objective
Implement role-based access control and user management module.

## Backend Implementation

### 1. Permission System

**Permission Format:** `resource:action`

**Resources:**
- users, roles, students, employees, faculties, departments
- programs, courses, classes, enrollments, grades
- attendance, payments, invoices, books, borrowings
- reports, settings, audit-logs

**Actions:**
- create, read, update, delete, export

**Example Permissions:**
- `users:create`, `users:read`, `users:update`, `users:delete`
- `students:create`, `grades:update`, `reports:export`

### 2. Role Definitions (seed data)

| Role | Key Permissions |
|------|-----------------|
| SUPER_ADMIN | All permissions |
| ADMIN | users:*, students:*, settings:*, reports:* |
| DEAN | departments:read, faculty-reports:*, courses:read |
| HOD | department-users:*, courses:*, classes:* |
| LECTURER | classes:read, attendance:*, grades:*, materials:* |
| STUDENT | own-profile:*, own-grades:read, own-attendance:read |
| HR_STAFF | employees:*, payroll:*, leave:* |
| FINANCE_STAFF | payments:*, invoices:*, finance-reports:* |
| LIBRARIAN | books:*, borrowings:* |

### 3. Permission Middleware Enhancement
```typescript
// Usage examples:
router.get('/users', authorize('users:read'), getUsers);
router.post('/users', authorize('users:create'), createUser);

// Multiple permissions (OR):
router.get('/reports', authorize(['reports:read', 'admin:reports']), getReports);

// Resource ownership check:
router.get('/students/:id/grades', authorizeOwnerOrPermission('grades:read'), getGrades);
```

### 4. User Management Service (src/services/user.service.ts)
- `createUser(data)` - Create with role assignment
- `getUsers(filters, pagination)` - List with search/filter
- `getUserById(id)` - Get single user with role
- `updateUser(id, data)` - Update profile/role
- `deleteUser(id)` - Soft delete
- `activateUser(id)` / `deactivateUser(id)`
- `bulkImportUsers(file)` - CSV/Excel import

### 5. User Routes
```
GET    /api/v1/users?page=1&limit=20&role=STUDENT&search=john
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
PATCH  /api/v1/users/:id/activate
PATCH  /api/v1/users/:id/deactivate
POST   /api/v1/users/bulk-import
GET    /api/v1/users/:id/activity
```

### 6. Role Management Routes
```
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/:id
PATCH  /api/v1/roles/:id
DELETE /api/v1/roles/:id
GET    /api/v1/permissions  # List all available permissions
```

### 7. Audit Logging Service
- Log all create/update/delete actions
- Store: userId, action, entity, entityId, oldValues, newValues, ip, timestamp
- Queryable by entity, user, date range

## Frontend Implementation

### 1. User Management Pages (src/pages/admin/users/)
- `UserListPage.tsx` - Table with pagination, search, filters
- `UserFormPage.tsx` - Create/edit form
- `UserDetailPage.tsx` - View user details + activity

### 2. Components Needed
- `DataTable` - Reusable table with pagination, sorting
- `SearchInput` - Debounced search
- `RoleSelect` - Role dropdown
- `StatusBadge` - Active/Inactive badge
- `ConfirmDialog` - For delete/deactivate actions

### 3. User Form Fields
- Email (required, unique)
- Username (required, unique)
- Password (required for create, optional for edit)
- First Name, Last Name
- Phone Number
- Role (select)
- Status (active/inactive)
- Profile Photo (optional)

### 4. Bulk Import UI
- File upload (CSV/Excel)
- Template download button
- Preview imported data
- Validation errors display
- Import progress

### 5. Role Management Pages
- `RoleListPage.tsx` - List roles
- `RoleFormPage.tsx` - Create/edit with permission checkboxes

### 6. Permission Hook
```typescript
// In any component:
const { hasPermission } = useAuth();

// Conditional rendering:
{hasPermission('users:create') && <Button>Add User</Button>}
```

## CSV Import Template
```csv
email,username,firstName,lastName,phone,role
john@example.com,john.doe,John,Doe,+252612345678,STUDENT
```

## Validation Checklist
- [ ] Can create user with role
- [ ] User list shows with pagination
- [ ] Search filters work
- [ ] Can activate/deactivate user
- [ ] Bulk import works with CSV
- [ ] Role-based UI elements show/hide correctly
- [ ] Activity log shows user actions
- [ ] Cannot delete own admin account
