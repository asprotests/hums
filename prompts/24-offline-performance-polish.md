# Prompt 24: Offline Mode, Performance & Final Polish

## Objective
Implement offline support, optimize performance, and complete final production-ready polish.

## Location: `hums-v2-project/prompts/24-offline-performance-polish.md`

---

## Part 1: Offline Support

### 1. Service Worker Setup
```typescript
// src/service-worker.ts
const CACHE_NAME = 'hums-v2-cache-v1';
const OFFLINE_QUEUE_KEY = 'offline-queue';

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Cache API responses for offline
const CACHEABLE_ROUTES = [
  '/api/v1/student/profile',
  '/api/v1/student/schedule',
  '/api/v1/config/public'
];
```

### 2. Offline Data Queue
```typescript
interface OfflineAction {
  id: string;
  type: 'ATTENDANCE' | 'GRADE';
  payload: any;
  timestamp: DateTime;
  retryCount: number;
}

// Queue actions when offline
queueOfflineAction(action: OfflineAction): void
getOfflineQueue(): OfflineAction[]
syncOfflineQueue(): Promise<SyncResult>
clearSyncedActions(ids: string[]): void
```

### 3. Critical Offline Features
```
✓ View cached schedule
✓ View cached grades
✓ Mark attendance (queued)
✓ Enter grades (queued)
✓ View downloaded course materials
✗ New registrations (online only)
✗ Payments (online only)
```

### 4. Offline Indicator Component
```tsx
function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { queueLength } = useOfflineQueue();
  
  if (isOnline && queueLength === 0) return null;
  
  return (
    <Banner variant={isOnline ? 'warning' : 'error'}>
      {!isOnline && '📴 You are offline. Some features are limited.'}
      {isOnline && queueLength > 0 && `🔄 Syncing ${queueLength} pending actions...`}
    </Banner>
  );
}
```

---

## Part 2: Performance Optimization

### 1. Backend Optimizations

**Database:**
```sql
-- Add missing indexes
CREATE INDEX idx_enrollments_student_semester ON enrollments(student_id, semester_id);
CREATE INDEX idx_attendance_class_date ON student_attendance(class_id, date);
CREATE INDEX idx_payments_student_date ON payments(student_id, created_at);
CREATE INDEX idx_grades_enrollment ON grades(enrollment_id);
```

**Caching with Redis:**
```typescript
// Cache frequently accessed data
const cacheConfig = {
  'student:profile': 3600,        // 1 hour
  'config:public': 86400,         // 24 hours
  'academic:current-semester': 3600,
  'dashboard:stats': 300          // 5 minutes
};

async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetcher();
  await redis.setex(key, cacheConfig[key], JSON.stringify(data));
  return data;
}
```

**Query Optimization:**
```typescript
// Use select to limit fields
const students = await prisma.student.findMany({
  select: {
    id: true,
    studentId: true,
    user: { select: { firstName: true, lastName: true } }
  }
});

// Use pagination
const results = await prisma.student.findMany({
  skip: (page - 1) * limit,
  take: limit
});
```

### 2. Frontend Optimizations

**Code Splitting:**
```typescript
// Lazy load portal routes
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));
const StudentPortal = lazy(() => import('./pages/student/StudentPortal'));
const AcademicPortal = lazy(() => import('./pages/academic/AcademicPortal'));
```

**React Query Caching:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false
    }
  }
});
```

**Image Optimization:**
```typescript
// Use next/image or similar
<Image
  src={student.photo}
  width={100}
  height={100}
  placeholder="blur"
  loading="lazy"
/>
```

---

## Part 3: Final Polish

### 1. Error Handling

**Global Error Boundary:**
```tsx
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**API Error Handler:**
```typescript
// Consistent error response format
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  logger.error({ err, req });
  
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      ...(isDev && { stack: err.stack })
    }
  });
});
```

### 2. Loading States

```tsx
// Skeleton loaders for all data
function StudentDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
```

### 3. Empty States

```tsx
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {icon}
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Usage
<EmptyState
  icon={<BookIcon className="h-12 w-12 text-gray-400" />}
  title="No books found"
  description="Try adjusting your search or filters"
  action={<Button onClick={clearFilters}>Clear Filters</Button>}
/>
```

### 4. Accessibility (a11y)

```tsx
// Keyboard navigation
<Button onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>

// ARIA labels
<input aria-label="Search students" />

// Focus management
useEffect(() => {
  if (isOpen) modalRef.current?.focus();
}, [isOpen]);

// Color contrast: Ensure 4.5:1 ratio
```

### 5. Print Styles

```css
@media print {
  .no-print { display: none; }
  .print-only { display: block; }
  
  /* Transcript print layout */
  .transcript {
    font-size: 10pt;
    margin: 0;
  }
}
```

### 6. PWA Manifest

```json
// public/manifest.json
{
  "name": "Hormuud University Management System",
  "short_name": "HUMS",
  "description": "University management system for Hormuud University",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a365d",
  "theme_color": "#1a365d",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Part 4: Production Checklist

### Security
- [ ] All secrets in environment variables
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (sanitized output)
- [ ] CSRF tokens on forms
- [ ] Security headers (helmet.js)
- [ ] Admin accounts require 2FA

### Performance
- [ ] Database indexes optimized
- [ ] Redis caching implemented
- [ ] API response times < 500ms
- [ ] Page load times < 3 seconds
- [ ] Images optimized and lazy loaded
- [ ] Code splitting implemented
- [ ] Gzip compression enabled

### Reliability
- [ ] Error logging (Winston/Pino)
- [ ] Error tracking (Sentry)
- [ ] Health check endpoint
- [ ] Database backups automated
- [ ] Graceful shutdown handling
- [ ] Retry logic for external services

### User Experience
- [ ] Loading skeletons everywhere
- [ ] Empty states for all lists
- [ ] Error messages are helpful
- [ ] Success feedback on actions
- [ ] Offline indicator shows
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Bilingual complete (en/so)

### Documentation
- [ ] API documentation (Swagger)
- [ ] README with setup instructions
- [ ] Environment variables documented
- [ ] Database schema documented
- [ ] Deployment guide written

---

## Final Validation

Run through these user journeys end-to-end:

1. **Admin Journey**
   - Login → Create faculty → Create department → Create program
   - Admit student → Approve → Enroll
   - Record payment → Generate receipt

2. **Student Journey**
   - Login → View dashboard → Check grades
   - View schedule → Check attendance
   - Make online payment → Download receipt

3. **Lecturer Journey**
   - Login → View classes → Mark attendance
   - Enter grades → Publish results
   - Upload course materials

4. **HR Journey**
   - Create employee → Onboarding checklist
   - Approve leave → Process payroll
   - Generate payslips

5. **Librarian Journey**
   - Add book → Issue to student
   - Process return → Handle overdue

6. **Offline Test**
   - Go offline → Mark attendance
   - Come online → Verify sync

---

## 🎉 Project Complete!

With this prompt, HUMS V2 is production-ready. Congratulations!

## Validation Checklist

- [ ] Service worker registered
- [ ] Offline indicator shows when disconnected
- [ ] Cached pages load when offline
- [ ] Offline queue stores pending actions
- [ ] Data syncs when back online
- [ ] Database indexes added
- [ ] Redis caching works (if configured)
- [ ] API responses under 500ms
- [ ] Code splitting implemented
- [ ] Lazy loading works for portals
- [ ] Error boundary catches errors
- [ ] Loading skeletons display
- [ ] Empty states show properly
- [ ] PWA manifest configured
- [ ] App installable on mobile
- [ ] All user journeys pass (Admin, Student, Lecturer, HR, Library)