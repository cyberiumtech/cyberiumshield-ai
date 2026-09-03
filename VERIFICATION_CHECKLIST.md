# Verification Checklist

This document helps you verify that all scaffolding components are working correctly.

## Pre-flight Checks

### Required Software
- [ ] Docker Desktop installed and running
- [ ] Docker Compose v2.0+ (`docker compose version`)
- [ ] Node.js 20+ (`node --version`)
- [ ] Python 3.11+ (`python --version`)
- [ ] Git (`git --version`)

## Backend Verification

### 1. Install Python Dependencies
```bash
cd apps/backend/python-ai
pip install -r requirements.txt
```

### 2. Run Backend Tests (Local)
```bash
cd apps/backend/python-ai
pytest -v
```

**Expected Output:**
```
tests/test_health.py::test_health_check PASSED
tests/test_health.py::test_health_check_structure PASSED
```

### 3. Test Database Models
```bash
cd apps/backend/python-ai
python -c "from app.db.models import User, Role, Permission; print('Models loaded successfully')"
```

### 4. Test Configuration Loading
```bash
cd apps/backend/python-ai
python -c "from app.core.config import settings; print(f'App: {settings.APP_NAME}')"
```

## Frontend Verification

### 1. Install Node Dependencies
```bash
cd apps/web
npm install
```

### 2. Run Frontend Tests
```bash
cd apps/web
npm test
```

**Expected Output:**
```
✓ src/App.test.tsx (2 tests)
   ✓ App > renders without crashing
   ✓ App > renders app structure
```

### 3. Lint Check
```bash
cd apps/web
npm run lint
```

### 4. Build Check
```bash
cd apps/web
npm run build
```

## Docker Compose Full Stack

### 1. Start All Services
```bash
docker compose up -d
```

**Expected Services:**
- nginx
- frontend (port 5173)
- backend (python-ai, port 8000)
- mysql (port 3306)
- redis (port 6379)

### 2. Check Service Status
```bash
docker compose ps
```

All services should show `Up` or `Up (healthy)`.

### 3. View Logs
```bash
# All services
docker compose logs

# Specific service
docker compose logs python-ai
docker compose logs frontend
```

### 4. Test Backend Health Endpoint
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "CyberiumShield AI",
  "environment": "development"
}
```

### 5. Test Frontend Access
Open browser: http://localhost:5173

**Expected Result:**
- Page loads without errors
- Landing page or login page appears
- No console errors in browser DevTools

### 6. Test Database Connection
```bash
docker compose exec python-ai python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

### 7. Check Database Tables
```bash
docker compose exec mysql mysql -u cyberiumshield -pcyberiumshield cyberiumshield -e "SHOW TABLES;"
```

**Expected Tables:**
```
+-----------------------------+
| Tables_in_cyberiumshield    |
+-----------------------------+
| alembic_version             |
| permissions                 |
| role_permissions            |
| roles                       |
| user_roles                  |
| users                       |
+-----------------------------+
```

### 8. Test Redis Connection
```bash
docker compose exec redis redis-cli ping
```

**Expected:** `PONG`

### 9. Stop Services
```bash
docker compose down
```

## Troubleshooting

### Backend Won't Start
1. Check if port 8000 is already in use:
   ```bash
   netstat -ano | findstr :8000  # Windows
   lsof -i :8000                  # Mac/Linux
   ```

2. Check logs:
   ```bash
   docker compose logs python-ai
   ```

3. Verify Python dependencies installed:
   ```bash
   docker compose exec python-ai pip list
   ```

### Frontend Won't Start
1. Check if port 5173 is already in use
2. Clear node_modules and reinstall:
   ```bash
   cd apps/web
   rm -rf node_modules package-lock.json
   npm install
   ```

### Database Connection Issues
1. Check MySQL is running:
   ```bash
   docker compose ps mysql
   ```

2. Test MySQL connection:
   ```bash
   docker compose exec mysql mysqladmin ping -h localhost -u cyberiumshield -pcyberiumshield
   ```

3. Check database exists:
   ```bash
   docker compose exec mysql mysql -u root -pcyberiumshield_root -e "SHOW DATABASES;"
   ```

### Migration Issues
1. Check current migration version:
   ```bash
   docker compose exec python-ai alembic current
   ```

2. Run migrations manually:
   ```bash
   docker compose exec python-ai alembic upgrade head
   ```

3. Reset migrations (caution: deletes data):
   ```bash
   docker compose exec python-ai alembic downgrade base
   docker compose exec python-ai alembic upgrade head
   ```

## Success Criteria

All checks passed when:
- ✅ Backend pytest: 2/2 tests pass
- ✅ Frontend vitest: 2/2 tests pass
- ✅ docker compose up: all services start with no errors
- ✅ GET http://localhost:8000/health returns 200 with correct JSON
- ✅ http://localhost:5173 loads in browser without errors
- ✅ Database has 6 tables (users, roles, permissions, user_roles, role_permissions, alembic_version)
- ✅ Redis responds to PING with PONG

## Quick Smoke Test Script

```bash
#!/bin/bash
echo "🚀 Starting verification..."

echo "1. Starting services..."
docker compose up -d

echo "2. Waiting for services to be ready..."
sleep 30

echo "3. Testing backend health..."
curl -f http://localhost:8000/health || echo "❌ Backend health check failed"

echo "4. Testing database..."
docker compose exec -T mysql mysql -u cyberiumshield -pcyberiumshield cyberiumshield -e "SHOW TABLES;" || echo "❌ Database check failed"

echo "5. Testing Redis..."
docker compose exec -T redis redis-cli ping || echo "❌ Redis check failed"

echo "✅ Verification complete!"
docker compose ps
```

Save as `verify.sh`, make executable (`chmod +x verify.sh`), and run (`./verify.sh`).
