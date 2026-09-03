# Quick Reference Card

## 🚀 One-Command Startup
```bash
docker compose up
```

## 🔗 Service URLs
- Backend API: http://localhost:8000
- Health Check: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- MySQL: localhost:3306
- Redis: localhost:6379

## 🧪 Run Tests
```bash
# Backend
cd apps/backend/python-ai && pytest -v

# Frontend
cd apps/web && npm test
```

## 📊 Check Status
```bash
# All services
docker compose ps

# Logs
docker compose logs python-ai
docker compose logs frontend

# Health check
curl http://localhost:8000/health
```

## 🗄️ Database Commands
```bash
# Run migrations
docker compose exec python-ai alembic upgrade head

# Show tables
docker compose exec mysql mysql -u cyberiumshield -pcyberiumshield cyberiumshield -e "SHOW TABLES;"

# Check migration status
docker compose exec python-ai alembic current
```

## 🛠️ Development
```bash
# Backend (local)
cd apps/backend/python-ai
pip install -r requirements.txt
uvicorn app.api.main:app --reload

# Frontend (local)
cd apps/web
npm install
npm run dev

# Code quality
cd apps/web && npm run lint
cd apps/backend/python-ai && black . && ruff check .
```

## 🔄 Restart Services
```bash
# Restart one service
docker compose restart python-ai

# Restart all
docker compose down && docker compose up

# Full reset (deletes data!)
docker compose down -v && docker compose up
```

## 📦 Dependencies
```bash
# Backend
cd apps/backend/python-ai
pip install -r requirements.txt

# Frontend
cd apps/web
npm install
```

## 🐛 Troubleshooting
```bash
# Port conflicts
netstat -ano | findstr :8000   # Windows
lsof -i :8000                   # Mac/Linux

# Clear frontend cache
cd apps/web
rm -rf node_modules package-lock.json
npm install

# Reset database
docker compose down -v
docker compose up mysql
docker compose exec python-ai alembic upgrade head

# View detailed logs
docker compose logs -f python-ai
```

## 📁 Key Files
- Backend config: `apps/backend/python-ai/.env`
- Backend models: `apps/backend/python-ai/app/db/models.py`
- Backend routes: `apps/backend/python-ai/app/api/routes/`
- Frontend config: `apps/web/vite.config.ts`
- Frontend app: `apps/web/src/app/App.tsx`
- Docker: `docker-compose.yml`

## 🔐 Default Credentials
**MySQL:**
- Database: cyberiumshield
- User: cyberiumshield
- Password: cyberiumshield
- Root Password: cyberiumshield_root

**⚠️ Change these for production!**

## 📚 Documentation
- **START_HERE.md** - Getting started guide
- **SCAFFOLDING_COMPLETE.md** - Technical details
- **VERIFICATION_CHECKLIST.md** - Testing steps
- **PHASE_1_COMPLETE.md** - Summary & metrics

## ✅ Health Check Expected Response
```json
{
  "status": "healthy",
  "service": "CyberiumShield AI",
  "environment": "development"
}
```

## 🎯 Definition of Done
- ✅ docker compose up starts all services
- ✅ GET /health returns 200
- ✅ Frontend loads in browser
- ✅ Backend tests pass (pytest)
- ✅ Frontend tests pass (vitest)
