# My Time — Backend API

> Crystal TS · Timesheet & Workforce Management System

## Architecture

```
src/
├── config/          # App, database, swagger configs
├── constants/       # Enums, static values
├── controllers/     # Request/response handlers (thin)
├── services/        # Business logic layer
├── repositories/    # Database access layer
├── middlewares/     # Auth, error handler, validation
├── routes/          # Express route definitions
├── validators/      # Joi schemas
├── utils/           # Logger, JWT, S3, helpers
├── infrastructure/
│   └── models/      # Sequelize models + associations
├── app.js           # Express app setup
└── server.js        # Entry point
migrations/          # Sequelize migrations (schema-only)
seeders/             # Seed data
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Sequelize |
| Validation | Joi |
| Auth | JWT + bcrypt |
| File Storage | AWS S3 |
| Logging | Winston |
| Docs | Swagger (OpenAPI 3.0) |
| Container | Docker |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Create database
createdb mytime_db

# 4. Run migrations
npm run db:migrate

# 5. Seed data
npm run db:seed

# 6. Start development server
npm run dev
```

### Docker

```bash
# From project root (parent of Frontend + Backend)
docker-compose up --build
```

## API Documentation

Start the server and visit: **http://localhost:5000/api-docs**

## Seeded Users

| Email | Password | Role |
|-------|----------|------|
| admin@crystalts.com | admin123 | Admin |
| sarah@crystalts.com | admin123 | Manager |
| mike@crystalts.com | admin123 | Employee |
| emily@crystalts.com | admin123 | Employee |
| david@crystalts.com | admin123 | Employee |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request OTP |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Current user |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/avatar` | Upload avatar (S3) |
| PUT | `/api/users/change-password` | Change password |

### Timesheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timesheets/my` | My timesheets |
| GET | `/api/timesheets/week?weekStartDate=` | Get week |
| POST | `/api/timesheets/save` | Save/create |
| POST | `/api/timesheets/submit` | Submit |
| POST | `/api/timesheets/recall/:id` | Recall |
| GET | `/api/timesheets/detail/:id` | View detail |
| GET | `/api/timesheets/approvals` | Pending (manager) |
| POST | `/api/timesheets/approvals/action` | Approve/reject |
| GET | `/api/timesheets/reports` | Reports data |

### Admin (Admin role only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/admin/designations` | Designations |
| CRUD | `/api/admin/employees` | Employees |
| CRUD | `/api/admin/projects` | Projects |
| CRUD | `/api/admin/assignments` | Assignments |
| CRUD | `/api/admin/milestones` | Milestones |

## Environment Variables

See `.env.example` for all required variables.

## Security

- **Helmet** — HTTP security headers
- **CORS** — Configurable origin whitelist
- **Rate Limiting** — 100 req/15min per IP
- **HPP** — HTTP parameter pollution protection
- **JWT** — Token-based auth with expiry
- **bcrypt** — Password hashing (12 rounds)
- **Central Error Handler** — No stack traces in production
