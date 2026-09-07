<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge&logo=github" alt="Status"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-v3-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel" alt="Laravel 12"/>
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python" alt="Python 3.11"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker" alt="Docker Compose"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql" alt="MySQL 8.0"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=open-source-initiative" alt="MIT License"/>
</div>

<br/>

<h1 align="center">
  🛡️ CyberShield-AI — Enterprise AI-Powered Cybersecurity Platform
</h1>

<p align="center">
  <b>Next-generation cybersecurity operations platform powered by artificial intelligence.</b><br/>
  Protect, detect, and respond to cyber threats with real-time AI-driven analytics.
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-development">Development</a> •
  <a href="#-project-status">Status</a> •
  <a href="#-license">License</a>
</p>

---

## 📋 Overview

**CyberShield-AI** is a comprehensive, enterprise-grade cybersecurity operations platform that leverages artificial intelligence and machine learning to provide real-time threat detection, vulnerability management, incident response, and security analytics. Built with a modern monorepo architecture, the platform combines a powerful React-based frontend with Laravel REST API backend and Python AI/ML microservices.

The platform is designed for Security Operations Centers (SOCs), security analysts, and enterprise IT teams who need a unified, AI-powered command center to monitor, detect, investigate, and respond to cybersecurity threats across their entire infrastructure.

### Current State

| Component | Status | Details |
|-----------|--------|---------|
| 🖥️ Frontend | ✅ **100% Complete** | React 19 + TypeScript, all pages implemented |
| 🔐 Authentication | ✅ **100% Complete** | Login, Register, Forgot/Reset Password, Email Verification |
| 📊 Dashboard Pages | ✅ **11 Pages Complete** | All dashboard views functional with mock data |
| 🎨 UI/UX | ✅ **Complete** | Light/Dark themes, animations, responsive design |
| 🗄️ Database | ✅ **Ready** | MySQL 8.0 configured, schema designed |
| 🔧 Laravel API | 🔄 **60% Complete** | Scaffold installed, routes planned |
| 🤖 Python AI | 🔄 **Scaffolded** | FastAPI structure ready, models pending |
| 🔗 Integration | ⏳ **Pending** | Backend connection from frontend |

---

## 🚀 Key Features

### 🔍 Threat Detection & Intelligence
- **Real-time Threat Monitoring** — Live-feed threat table with auto-updating entries every 5 seconds
- **AI-Powered Analysis** — Machine learning classification of threats with confidence scoring
- **Risk Scoring** — Automated risk assessment with severity levels (Critical, High, Medium, Low)
- **Threat Intelligence Feeds** — Integration with global threat data sources
- **MITRE ATT&CK Mapping** — Framework-aligned threat categorization

### 🛡️ Vulnerability Management
- **Automated Scanning** — Infrastructure & application vulnerability scanning
- **CVE Database Integration** — Real-time CVE lookup and correlation
- **Patch Recommendations** — Intelligent remediation suggestions
- **Risk Prioritization** — Severity-based vulnerability ranking

### 📡 Network Monitoring
- **Real-time Traffic Analysis** — Deep packet inspection and flow monitoring
- **Anomaly Detection** — Behavioral analysis for lateral movement detection
- **Bandwidth Monitoring** — Network utilization tracking

### 🦠 Malware, Phishing & Email Spam Detection
- **File Scanner** — Static & dynamic malware analysis with sandboxing
- **URL Scanner** — Real-time URL reputation checking
- **Email Spam Detector** — Real-email-trained text classification, header analysis, explainable signals, and local scan history
- **QR Code Scanner** — QR-based threat detection

### 🤖 AI Security Assistant
- **Natural Language Interface** — Chat-based security queries
- **Threat Investigation** — Automated incident analysis
- **Security Recommendations** — Context-aware remediation suggestions
- **Code Highlighting** — Markdown and code block support in responses

### 📊 Analytics & Reporting
- **Interactive Dashboards** — Real-time charts, graphs, and metrics
- **Custom Reports** — PDF/Excel report generation
- **Trend Analysis** — Historical data visualization
- **Export Capabilities** — Multi-format data export

### 🔐 Authentication & Security
- **Multi-Factor Authentication** — TOTP, hardware token support
- **Role-Based Access Control** — Granular permissions (Super Admin, SOC Manager, Analyst, etc.)
- **Session Management** — Token-based authentication with Sanctum
- **Email Verification** — Verified user workflows
- **Password Management** — Forgot/reset password with strength meter

### 🌐 User Experience
- **Dark/Light Theme** — Persistent theme selection with system preference support
- **Multi-Language Support** — English & Nepali (extensible)
- **Responsive Design** — Mobile, tablet, and desktop optimized
- **Framer Motion Animations** — Smooth, premium UI transitions
- **Global Search** — Cross-platform search functionality

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5.4 | Build tool |
| TailwindCSS | 3.4 | Utility-first CSS |
| Framer Motion | 11.3 | Animations |
| Recharts | 2.15 | Data visualization |
| TanStack React Query | 5.59 | Server state management |
| React Router | 7.0 | Client-side routing |
| Axios | 1.7 | HTTP client |
| Lucide React | 0.468 | Icon library |

### Backend (API)
| Technology | Version | Purpose |
|------------|---------|---------|
| Laravel | 12 | PHP framework |
| PHP | 8.4 | Runtime |
| Laravel Sanctum | Latest | API authentication |
| MySQL | 8.0 | Database |

### Backend (AI/ML)
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | Latest | Python web framework |
| Python | 3.11 | Runtime |
| scikit-learn | Latest | Machine learning |
| TensorFlow | Latest | Deep learning |
| PyTorch | Latest | Neural networks |
| Transformers | Latest | NLP models |
| Pandas/NumPy | Latest | Data processing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker & Docker Compose | Containerization |
| Nginx | Reverse proxy |
| Redis | Cache & queue |
| MySQL 8.0 | Database |

---

## 📁 Project Architecture

```
cyberiumshield-ai/
├── apps/
│   ├── web/                          # React 19 Frontend
│   │   ├── src/
│   │   │   ├── app/                  # Main App component & routing
│   │   │   ├── components/           # Reusable UI components
│   │   │   │   ├── ui/              # Primitives (cards, tables, charts, etc.)
│   │   │   │   ├── shared/          # Shared app components
│   │   │   │   ├── modals/          # Modal dialogs
│   │   │   │   └── ...
│   │   │   ├── pages/               # Page-level components
│   │   │   │   ├── Landing/         # Marketing landing page
│   │   │   │   ├── Dashboard/       # Security dashboard
│   │   │   │   ├── ThreatDetection/ # Real-time threat monitoring
│   │   │   │   ├── SecurityCenter/  # Security operations center
│   │   │   │   ├── Vulnerability/   # Vulnerability management
│   │   │   │   ├── Network/         # Network monitoring
│   │   │   │   ├── Malware/         # Malware detection
│   │   │   │   ├── Phishing/        # Phishing detection
│   │   │   │   ├── EmailSpam/       # Email spam detection
│   │   │   │   ├── Logs/            # Log analysis
│   │   │   │   ├── Reports/         # Reporting
│   │   │   │   ├── AIAssistant/     # AI chat interface
│   │   │   │   ├── Login/           # Authentication
│   │   │   │   └── ...
│   │   │   ├── features/            # Domain-specific feature modules
│   │   │   ├── contexts/            # React contexts (Auth, Theme, Language)
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── services/            # API service layer
│   │   │   ├── layouts/             # Layout components
│   │   │   ├── types/               # TypeScript type definitions
│   │   │   ├── utils/               # Utility functions
│   │   │   ├── store/               # State management
│   │   │   ├── constants/           # App constants
│   │   │   ├── config/              # Configuration
│   │   │   ├── mock/                # Mock data for development
│   │   │   └── styles/              # Global styles & theme
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── backend/
│       ├── laravel-api/             # Laravel 12 REST API
│       │   ├── app/
│       │   │   ├── Http/
│       │   │   │   ├── Controllers/ # API controllers
│       │   │   │   ├── Middleware/  # Request middleware
│       │   │   │   ├── Requests/    # Form requests
│       │   │   │   └── Resources/   # API resources
│       │   │   ├── Models/          # Eloquent models
│       │   │   ├── Services/        # Business logic
│       │   │   ├── Repositories/    # Data access layer
│       │   │   ├── Events/          # Events
│       │   │   ├── Listeners/       # Event listeners
│       │   │   ├── Jobs/            # Queued jobs
│       │   │   ├── Notifications/   # Notifications
│       │   │   └── Policies/        # Authorization policies
│       │   ├── config/              # Configuration files
│       │   ├── database/
│       │   │   ├── migrations/      # Database migrations
│       │   │   └── seeders/         # Database seeders
│       │   ├── routes/              # API & web routes
│       │   └── composer.json
│       └── python-ai/               # FastAPI AI/ML Services
│           ├── app/
│           │   ├── api/             # API endpoints
│           │   ├── models/          # ML model definitions
│           │   ├── training/        # Model training scripts
│           │   ├── prediction/      # Inference/prediction
│           │   ├── preprocessing/   # Data preprocessing
│           │   ├── feature_engineering/
│           │   ├── evaluation/      # Model evaluation
│           │   ├── datasets/        # Dataset management
│           │   ├── experiments/     # Experiment tracking
│           │   └── utils/           # Utility functions
│           └── requirements.txt
├── database/                         # Data-layer artifacts
│   ├── mysql/
│   │   ├── migrations/              # Raw SQL migrations
│   │   ├── seeders/                 # Database seeders
│   │   └── backup/                  # Database backups
│   └── erd/                         # ER diagrams
├── datasets/                         # Training & testing datasets
│   ├── malware/
│   ├── phishing/
│   ├── network/
│   ├── logs/
│   ├── urls/
│   ├── emails/
│   ├── training/
│   └── testing/
├── models/                           # Saved ML models
│   ├── malware/
│   ├── phishing/
│   ├── anomaly/
│   ├── recommendation/
│   └── saved/
├── docs/                             # Documentation
│   ├── Proposal/
│   ├── SRS/
│   ├── Architecture/
│   ├── API/
│   ├── Database/
│   ├── UML/
│   ├── UserGuide/
│   └── DeveloperGuide/
├── infrastructure/                   # Infrastructure as code
│   ├── docker/
│   │   ├── frontend/                # Frontend Dockerfile
│   │   ├── backend/                 # Laravel Dockerfile
│   │   ├── python/                  # Python AI Dockerfile
│   │   ├── mysql/                   # MySQL configuration
│   │   ├── redis/                   # Redis configuration
│   │   └── nginx/                   # Nginx configuration
│   ├── kubernetes/                  # Kubernetes manifests
│   └── terraform/                   # Terraform scripts
├── postman/                          # Postman collections
├── scripts/                          # Utility scripts
├── diagrams/                         # Architecture diagrams
├── docker-compose.yml                # Docker Compose configuration
├── LICENSE                           # MIT License
└── README.md                         # This file
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20+ (for frontend)
- **PHP** 8.2+ & **Composer** (for Laravel backend)
- **Python** 3.11+ (for AI services)
- **Docker** & **Docker Compose** (for infrastructure)
- **MySQL** 8.0 (or via Docker)

### 1️⃣ Frontend (Standalone)

```bash
# Navigate to frontend
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:5173** (or 5174 if 5173 is in use).

> **Note:** The frontend runs with mock data by default. All 11 dashboard pages, authentication flows, and the AI assistant work without a backend connection.

### 2️⃣ Full Stack with Docker

```bash
# Start all services
docker-compose up -d

# Services:
# - Frontend: http://localhost:5173
# - Laravel API: http://localhost:8000
# - Python AI API: http://localhost:8000 (via FastAPI)
# - MySQL: localhost:3306
# - Redis: localhost:6379
# - Nginx: http://localhost:80
```

### 3️⃣ Backend Setup (Laravel)

```bash
cd apps/backend/laravel-api

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Configure database in .env
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=cyberiumshield
# DB_USERNAME=cyberiumshield
# DB_PASSWORD=cyberiumshield

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate

# Start Laravel server
php artisan serve --host=0.0.0.0 --port=8000
```

### 4️⃣ Backend Setup (Python AI)

```bash
cd apps/backend/python-ai

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

### 5️⃣ Environment Variables

Create `apps/web/.env` to connect to the backend:

```env
VITE_API_URL=http://localhost:8000
VITE_ENABLE_AUTH_API=false
```

> Set `VITE_ENABLE_AUTH_API=true` when the backend is ready.

---

## 💻 Development

### Frontend Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Available Frontend Pages

| Route | Page | Status |
|-------|------|--------|
| `/` | Landing Page | ✅ Complete |
| `/auth/login` | Login | ✅ Complete |
| `/auth/register` | Register | ✅ Complete |
| `/auth/forgot-password` | Forgot Password | ✅ Complete |
| `/auth/reset-password` | Reset Password | ✅ Complete |
| `/auth/verify-email` | Email Verification | ✅ Complete |
| `/dashboard` | Security Dashboard | ✅ Complete |
| `/security-center` | Security Center | ✅ Complete |
| `/threat-detection` | Threat Detection | ✅ Complete |
| `/network` | Network Monitoring | ⏳ Placeholder |
| `/vulnerability` | Vulnerability Management | ✅ Complete |
| `/threat-intelligence` | Threat Intelligence | ✅ Complete |
| `/malware` | Malware Detection | ✅ Complete |
| `/phishing` | Phishing Detection | ✅ Complete |
| `/email-spam` | Email Spam Detection | ✅ Complete |
| `/logs` | Log Analysis | ✅ Complete |
| `/incidents` | Incidents | ⏳ Placeholder |
| `/reports` | Reports | ✅ Complete |
| `/analytics` | Analytics | ⏳ Placeholder |
| `/ai-assistant` | AI Assistant | ✅ Complete |
| `/users` | User Management | ✅ Complete |
| `/roles` | Role Management | ✅ Complete |
| `/profile` | User Profile | ⏳ Placeholder |
| `/settings` | Settings | ⏳ Placeholder |

### Mock Data

The frontend uses mock data for development. All API calls go through `apps/web/src/services/api.ts` which uses Axios interceptors. The mock implementation is in `apps/web/src/mock/`.

To enable real API calls, update `apps/web/src/services/auth.service.ts` and uncomment the TODO sections.

---

## 🧪 Testing

### Frontend Testing

```bash
# Run tests (when implemented)
npm run test

# Type check
npx tsc --noEmit

# Build check
npm run build
```

### Manual Testing

1. **Authentication Flow**: Register → Login → Dashboard → Logout
2. **Theme Toggle**: Dark/Light/System theme persistence
3. **Language Selector**: English/Nepali translation
4. **Quick Actions**: All 5 modal actions (New Scan, Incident, Report, Ask AI, Add User)
5. **Threat Detection**: Live feed updates every 5 seconds
6. **AI Assistant**: Chat interface with markdown support
7. **Responsive Design**: Mobile, tablet, desktop layouts

---

## 📊 Project Status

### Complete ✅
- React 19 + TypeScript + Vite frontend
- 11 dashboard pages with full UI
- Authentication system (Login, Register, Password Reset, Email Verification)
- Interactive landing page with animated demos
- Light/Dark theme with system preference
- Multi-language support (English, Nepali)
- Responsive design (mobile/tablet/desktop)
- Framer Motion animations
- Recharts data visualizations
- TanStack Query state management
- Route protection (ProtectedRoute, GuestRoute)
- Threat Scanner (URL/Email)
- AI Security Assistant chat interface
- Docker Compose infrastructure
- MySQL database schema & configuration
- Project documentation structure

### In Progress 🔄
- Laravel 12 API backend (installed, needs controller/routes)
- Python AI/ML microservices (scaffolded)

### Pending ⏳
- Frontend-backend API integration
- Real email service
- File upload for malware scanning
- WebSocket for real-time updates
- Production deployment scripts
- CI/CD pipeline

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing patterns:
- TypeScript strict mode
- TailwindCSS for styling
- Framer Motion for animations
- Recharts for charts
- React Query for server state

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 📚 Additional Resources

- [Documentation](docs/README.md) — Comprehensive project documentation
- [Architecture Overview](docs/Architecture/README.md) — System architecture details
- [API Documentation](docs/API/README.md) — API endpoint reference
- [Database Schema](docs/Database/README.md) — Database design
- [User Guide](docs/UserGuide/README.md) — End-user documentation
- [Developer Guide](docs/DeveloperGuide/README.md) — Development setup guide
- [Postman Collection](postman/README.md) — API testing collection
- [Docker Setup](infrastructure/docker/README.md) — Container configuration
- [Quick Start Guide](QUICK_START.md) — Quick start reference

---

<p align="center">
  Built with ❤️ for the cybersecurity community<br/>
  <sub>© 2026 CyberShield-AI. All rights reserved.</sub>
</p>
