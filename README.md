# My Time — Backend API

> Crystal TS · Timesheet & Workforce Management System

## Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** v16 or higher
- **npm** v10 or higher

## Setup (Step by Step)

### 1. Clone the repository

```bash
git clone <your-backend-repo-url>
cd Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a PostgreSQL database

Make sure PostgreSQL is running on your system, then create the database:

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE mytime_db;"
```

Or you can use pgAdmin or any other PostgreSQL GUI tool to create a database named `mytime_db`.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and update the following values:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `mytime_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `JWT_SECRET` | Secret key for JWT tokens | `any_random_string` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `any_random_string` |
| `CORS_ORIGIN` | Frontend URL(s), comma-separated | `http://localhost:5173` |
| `PORT` | Server port | `5001` |

### 5. Start the server

**Development (with auto-reload):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server will auto-create all database tables on first startup (using Sequelize sync). No manual migrations needed.

### 6. Verify

Once started, you should see:

```
✅ Database connection established
✅ Database schema updated
🚀 Server running on port 5001 (development)
📚 API Docs: http://localhost:5001/api-docs
```

Visit `http://localhost:5001/api-docs` to see the Swagger API documentation.

## Architecture

```
src/
├── config/          # App, database, swagger configs
├── constants/       # Enums, static values
├── controllers/     # Request/response handlers
├── services/        # Business logic layer
├── middlewares/     # Auth, error handler, validation
├── routes/          # Express route definitions
├── validators/      # Joi schemas
├── utils/           # Logger, JWT, S3, helpers
├── infrastructure/
│   └── models/      # Sequelize models + associations
├── app.js           # Express app setup
└── server.js        # Entry point
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js 5 |
| Database | PostgreSQL 16 |
| ORM | Sequelize 6 |
| Validation | Joi |
| Auth | JWT + bcryptjs |
| File Storage | Local (uploads/) or AWS S3 |
| Logging | Winston |
| Docs | Swagger (OpenAPI 3.0) |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed initial data |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request OTP |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/me` | Current user info |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile (admin only) |
| POST | `/api/users/avatar` | Upload avatar |
| PUT | `/api/users/change-password` | Change password |

### Timesheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timesheets/my` | List my timesheets |
| GET | `/api/timesheets/week?weekStartDate=YYYY-MM-DD` | Get specific week |
| POST | `/api/timesheets/save` | Save draft entries |
| POST | `/api/timesheets/submit` | Submit entries |
| POST | `/api/timesheets/recall` | Recall entries |
| DELETE | `/api/timesheets/entry/:entryId` | Delete draft entry |
| GET | `/api/timesheets/assigned-projects` | My assigned projects |
| GET | `/api/timesheets/approvals` | Pending approvals (manager) |
| POST | `/api/timesheets/approvals/action` | Approve/reject entries |
| GET | `/api/timesheets/reports` | Reports data |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/admin/designations` | Manage designations |
| CRUD | `/api/admin/employees` | Manage employees |
| CRUD | `/api/admin/projects` | Manage projects |
| CRUD | `/api/admin/assignments` | Manage project assignments |
| CRUD | `/api/admin/milestones` | Manage milestones |

## Deployment Notes

- This is a **standalone** Node.js API. It can be deployed independently on any server.
- The frontend connects to this API via the `VITE_API_URL` environment variable.
- Set `CORS_ORIGIN` in `.env` to your frontend's deployed URL.
- Avatar files are stored in the `uploads/` directory by default. For production, configure AWS S3.
- Database tables are auto-created on server startup.

## Security

- **Helmet** — HTTP security headers
- **CORS** — Configurable origin whitelist
- **Rate Limiting** — Configurable per-IP rate limits
- **HPP** — HTTP parameter pollution protection
- **JWT** — Token-based auth with configurable expiry
- **bcryptjs** — Password hashing
