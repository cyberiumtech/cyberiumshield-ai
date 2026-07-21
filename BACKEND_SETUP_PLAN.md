# Backend Setup Plan - CyberiumShield AI

## Current Status
- ✅ MySQL 8.0 running on localhost:3306
- ✅ Database `cyberiumshield` created
- ✅ User `cyberiumshield` with full privileges
- ✅ Laravel 11 files copied
- 🔄 Composer dependencies installing
- ⏳ Laravel Sanctum to be configured

## Next Steps

### 1. Complete Laravel Installation
```bash
cd apps/backend/laravel-api
composer install
php artisan key:generate
php artisan storage:link
```

### 2. Install & Configure Sanctum
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 3. Database Migrations

Create migrations for:
- `users` table (enhanced)
- `organizations` table
- `roles` table
- `permissions` table
- `role_user` pivot table
- `sessions` table
- `password_reset_tokens` table
- `personal_access_tokens` table (Sanctum)

### 4. Models

Create:
- `User` model (with Sanctum HasApiTokens trait)
- `Organization` model
- `Role` model
- `Permission` model

### 5. Controllers

Create API controllers:
- `AuthController` - Login, Register, Logout
- `PasswordController` - Forgot, Reset
- `EmailVerificationController` - Verify, Resend
- `UserController` - Profile, Update
- `OrganizationController` - CRUD operations

### 6. Routes

Setup `routes/api.php`:
```php
// Public routes
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password

// Protected routes (Sanctum middleware)
POST /api/auth/logout
GET  /api/auth/user
POST /api/auth/email/verification-notification
GET  /api/auth/verify-email/{id}/{hash}

// User routes
GET    /api/users
POST   /api/users
GET    /api/users/{id}
PUT    /api/users/{id}
DELETE /api/users/{id}

// Organization routes
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/{id}
PUT    /api/organizations/{id}
DELETE /api/organizations/{id}
```

### 7. CORS Configuration

Update `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173', 'http://localhost:5174'],
'supports_credentials' => true,
```

### 8. Sanctum Configuration

Update `config/sanctum.php`:
```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:5173,localhost:5174,127.0.0.1,127.0.0.1:5173,127.0.0.1:5174')),
```

### 9. Run Migrations
```bash
php artisan migrate:fresh
```

### 10. Start Laravel Server
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### 11. Update Frontend API URL

Update `apps/web/src/services/api.ts`:
```typescript
const API_URL = 'http://localhost:8000';
```

### 12. Remove TODO Comments

Replace mock implementations with real API calls in:
- `apps/web/src/services/auth.service.ts`
- `apps/web/src/hooks/useAuth.ts`

### 13. Test Authentication Flow

1. Register new user
2. Verify email (skip for now)
3. Login
4. Access protected routes
5. Logout

## Database Schema

### users
```sql
id, name, email, email_verified_at, password, organization_id, 
role (enum: super_admin, organization_admin, security_analyst, soc_manager, auditor, viewer),
avatar, remember_token, created_at, updated_at
```

### organizations
```sql
id, name, slug, country, timezone, created_at, updated_at
```

### roles
```sql
id, name, slug, description, created_at, updated_at
```

### permissions
```sql
id, name, slug, description, created_at, updated_at
```

### role_user
```sql
id, user_id, role_id, created_at, updated_at
```

## API Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }
}
```

### Authentication Response
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "sanctum-token-here",
    "expires_at": "2026-07-21T00:00:00Z"
  },
  "message": "Login successful"
}
```

## Security Checklist

- ✅ Password hashing (bcrypt)
- ✅ CSRF protection
- ✅ Rate limiting on auth endpoints
- ✅ Email verification
- ✅ Password reset tokens
- ✅ Sanctum token authentication
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (Eloquent ORM)
- ✅ XSS prevention (Laravel escaping)

## Testing Endpoints

Use Postman or curl:

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password_confirmation": "SecurePass123!",
    "organization_name": "Acme Corp"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get User (with token)
curl -X GET http://localhost:8000/api/auth/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Timeline

Estimated time to complete: 2-3 hours
- Composer install: 5-10 minutes
- Migrations & Models: 30 minutes
- Controllers: 45 minutes
- Routes & Config: 15 minutes
- Testing: 30 minutes
- Frontend integration: 30 minutes

## Notes

- All passwords are hashed with bcrypt
- Tokens expire after 24 hours (configurable)
- Email verification is optional for development
- Rate limiting: 5 attempts per minute for auth endpoints
- Database uses UTF8MB4 for full emoji support
