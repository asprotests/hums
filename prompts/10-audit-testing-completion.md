# Prompt 10: Audit Logging, Testing & Phase 1 Completion

## Objective
Complete Phase 1 with comprehensive audit logging, testing setup, and final polish.

## Backend - Audit Logging

### 1. Audit Service (src/services/audit.service.ts)

```typescript
interface AuditLogEntry {
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  oldValues: object | null;
  newValues: object | null;
  ipAddress: string;
  userAgent: string;
  metadata?: object;
}

enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT'
}

// Service methods
log(entry: AuditLogEntry): Promise<void>
getAuditLogs(filters: AuditFilters, pagination): Promise<AuditLog[]>
getEntityHistory(entity: string, entityId: string): Promise<AuditLog[]>
getUserActivity(userId: string, dateRange?): Promise<AuditLog[]>
exportAuditLogs(filters: AuditFilters): Promise<Buffer>  // CSV export
```

### 2. Audit Middleware
```typescript
// Automatically log all mutations
export function auditMiddleware(entity: string) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log successful operations
        auditService.log({
          userId: req.user?.id,
          action: mapMethodToAction(req.method),
          entity,
          entityId: req.params.id || data?.id,
          oldValues: req.originalEntity,  // Set by controller
          newValues: data,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      return originalJson(data);
    };
    
    next();
  };
}
```

### 3. Audit API Routes
```
GET    /api/v1/audit-logs                    # List with filters
GET    /api/v1/audit-logs/entity/:type/:id   # Entity history
GET    /api/v1/audit-logs/user/:userId       # User activity
GET    /api/v1/audit-logs/export             # Export CSV
```

### 4. Audit Log Filters
- `userId` - Filter by user
- `action` - Filter by action type
- `entity` - Filter by entity type
- `dateFrom`, `dateTo` - Date range
- `search` - Search in entity names

## Frontend - Audit Log Viewer

### 1. Audit Log Page (src/pages/admin/AuditLogPage.tsx)
- Filterable table
- Timeline view option
- Entity link to view current state
- Export button

### 2. Entity History Component
Add "View History" button to all detail pages:
```tsx
<EntityHistory
  entity="students"
  entityId={studentId}
/>
```

## Testing Setup

### 1. Backend Testing (apps/api)

**Install dependencies:**
```json
{
  "devDependencies": {
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x",
    "@types/supertest": "^2.x"
  }
}
```

**Jest config (jest.config.js):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**'
  ]
};
```

**Test setup (src/test/setup.ts):**
```typescript
import { prisma } from '../lib/prisma';

beforeAll(async () => {
  // Connect to test database
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database between tests
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    // ... etc
  ]);
});
```

### 2. Unit Tests

**Auth Service Tests (src/services/__tests__/auth.service.test.ts):**
```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Setup
      const user = await createTestUser();
      
      // Execute
      const result = await authService.login(user.email, 'password');
      
      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
    
    it('should throw for invalid password', async () => {
      const user = await createTestUser();
      
      await expect(
        authService.login(user.email, 'wrong')
      ).rejects.toThrow('Invalid credentials');
    });
    
    it('should log failed attempt', async () => {
      const user = await createTestUser();
      
      try {
        await authService.login(user.email, 'wrong');
      } catch {}
      
      const logs = await prisma.auditLog.findMany({
        where: { action: 'LOGIN_FAILED' }
      });
      expect(logs).toHaveLength(1);
    });
  });
  
  describe('refreshToken', () => {
    it('should return new access token', async () => {
      // ...
    });
    
    it('should reject expired refresh token', async () => {
      // ...
    });
  });
});
```

**Student Service Tests:**
```typescript
describe('StudentService', () => {
  describe('generateStudentId', () => {
    it('should generate sequential ID', async () => {
      const id1 = await studentService.generateStudentId(2025);
      const id2 = await studentService.generateStudentId(2025);
      
      expect(id1).toBe('HU/2025/0001');
      expect(id2).toBe('HU/2025/0002');
    });
    
    it('should reset sequence for new year', async () => {
      await studentService.generateStudentId(2025);
      const id = await studentService.generateStudentId(2026);
      
      expect(id).toBe('HU/2026/0001');
    });
  });
});
```

### 3. Integration Tests (API Tests)

**Auth Routes (src/routes/__tests__/auth.routes.test.ts):**
```typescript
import request from 'supertest';
import { app } from '../../app';

describe('POST /api/v1/auth/login', () => {
  it('should return 200 and tokens', async () => {
    await createTestUser({ email: 'test@example.com', password: 'Test123!' });
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' });
    
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
  
  it('should return 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrong' });
    
    expect(res.status).toBe(401);
  });
  
  it('should rate limit after 5 attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    
    expect(res.status).toBe(429);
  });
});
```

### 4. Frontend Testing (apps/web)

**Install dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "msw": "^2.x"
  }
}
```

**Component Tests:**
```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('should show validation errors', async () => {
    render(<LoginForm />);
    
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });
  
  it('should call onSubmit with credentials', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });
});
```

### 5. Test Scripts
```json
{
  "scripts": {
    "test": "turbo run test",
    "test:api": "cd apps/api && jest",
    "test:api:watch": "cd apps/api && jest --watch",
    "test:api:coverage": "cd apps/api && jest --coverage",
    "test:web": "cd apps/web && vitest",
    "test:web:coverage": "cd apps/web && vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

## Final Phase 1 Checklist

### Core Functionality
- [ ] User can login/logout
- [ ] Password reset works
- [ ] Role-based access control working
- [ ] Admin can manage users
- [ ] Admin can manage academic structure
- [ ] Student admission workflow complete
- [ ] Fee structures configured
- [ ] Payments can be recorded
- [ ] Receipts generate correctly

### Student Portal
- [ ] Dashboard loads with correct data
- [ ] Profile displays and edits work
- [ ] Finance section shows balance
- [ ] Language switching works

### Technical
- [ ] All APIs documented in Swagger
- [ ] Audit logs capturing all changes
- [ ] Error handling consistent
- [ ] API response format consistent
- [ ] Database migrations versioned

### Testing
- [ ] Auth service tests passing
- [ ] User management tests passing
- [ ] Student service tests passing
- [ ] Payment service tests passing
- [ ] API integration tests passing
- [ ] Frontend component tests passing
- [ ] Coverage > 60% for services

### Documentation
- [ ] README updated with setup instructions
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Database schema documented

## Commands to Validate

```bash
# Run all tests
pnpm test

# Check coverage
pnpm test:api:coverage

# Start fresh and verify
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev

# Verify in browser
# 1. Login as admin@hormuud.edu.so / Admin123!
# 2. Create a faculty, department, program
# 3. Create a student through admission
# 4. Record a payment
# 5. Login as the student
# 6. Verify dashboard shows correct info
```

## Next Steps (Phase 2 Preview)
After Phase 1 completion:
1. Class/enrollment management
2. Attendance marking
3. Grade entry
4. Full academic portal
5. HR module

Phase 1 provides the foundation. Phase 2 adds the academic workflow.

## Validation Checklist

- [ ] Audit log service created
- [ ] Audit middleware captures all CRUD operations
- [ ] Login attempts are logged
- [ ] Audit log viewer page works
- [ ] Entity history can be viewed
- [ ] Jest configured for backend
- [ ] Vitest configured for frontend
- [ ] Auth service tests pass
- [ ] Student service tests pass
- [ ] API integration tests pass
- [ ] `npm test` runs without errors in backend
- [ ] `npm test` runs without errors in frontend
- [ ] Test coverage report generates