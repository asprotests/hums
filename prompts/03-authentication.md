# Prompt 03: Authentication System

## Objective
Implement complete JWT-based authentication with refresh tokens.

## Backend Implementation (apps/api)

### 1. Auth Service (src/services/auth.service.ts)
- `register(data)` - Create user (admin use only)
- `login(email, password)` - Validate and return tokens
- `logout(refreshToken)` - Invalidate session
- `refreshToken(token)` - Issue new access token
- `forgotPassword(email)` - Generate reset token, send email
- `resetPassword(token, newPassword)` - Reset with token
- `changePassword(userId, oldPassword, newPassword)`

### 2. Token Management
- Access token: JWT, 15 minutes expiry
- Refresh token: JWT, 7 days expiry, stored in Session table
- Include in payload: userId, email, role, permissions

### 3. Password Requirements
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 number
- Use bcrypt with salt rounds = 12
- Implement password history (prevent last 5)

### 4. Security Middleware (src/middleware/)
- `authenticate.ts` - Verify JWT, attach user to request
- `authorize.ts` - Check permissions: `authorize('users:create')`
- `rateLimiter.ts` - Rate limit auth endpoints (5 attempts/15 min)

### 5. Auth Routes (src/routes/auth.routes.ts)
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/change-password
```

### 6. Validation (use Zod)
- Login: email required, password required
- Register: full validation
- Password reset: token required, password with rules

### 7. Session Management
- Store sessions in database
- Track IP address and user agent
- Support multiple sessions per user
- Cleanup expired sessions (cron job or on-demand)

## Frontend Implementation (apps/web)

### 1. Auth Context (src/contexts/AuthContext.tsx)
- Store user, tokens in context
- Auto-refresh token before expiry
- Persist to localStorage (encrypted)
- Clear on logout

### 2. Auth Hook (src/hooks/useAuth.ts)
- `login(email, password)`
- `logout()`
- `isAuthenticated`
- `user`
- `hasPermission(permission)`

### 3. Protected Route Component
- Redirect to login if not authenticated
- Check permissions for route access

### 4. Auth Pages (src/pages/auth/)
- `LoginPage.tsx` - Email/password form
- `ForgotPasswordPage.tsx` - Email form
- `ResetPasswordPage.tsx` - New password form

### 5. API Client Setup (src/lib/api.ts)
- Axios instance with interceptors
- Auto-attach Authorization header
- Handle 401 responses (refresh or logout)
- Handle token refresh transparently

## Testing Requirements
- Unit test auth service methods
- Test JWT generation and validation
- Test rate limiting
- Test password validation

## Validation Checklist
- [ ] Can login with seeded admin user
- [ ] Access token expires after 15 min
- [ ] Refresh token works
- [ ] Rate limiting blocks after 5 failed attempts
- [ ] Password reset flow works (check logs for email)
- [ ] Protected routes redirect to login
- [ ] Logout invalidates session
