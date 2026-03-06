# Auth & Organization Management System

A comprehensive Node.js backend with Google OAuth, email/password authentication with OTP verification, role-based access control, and organization management.

## Features

- **Authentication**
  - Email/password signup with email OTP verification
  - Google OAuth 2.0 login
  - JWT token-based authentication
  - Password reset with OTP

- **Role Management**
  - Pre-defined roles: Super Admin, Admin, Organization Admin, Staff, Volunteer, Sponsor
  - Role hierarchy with permission inheritance
  - Admin-only role assignment

- **Organization Management**
  - CRUD operations for organizations
  - Organization types: Orphanage, School, NGO, Shelter Home
  - Organization Admin can manage their own organization

## Prerequisites

- Node.js 16+
- MySQL 8.0+

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` file with your settings:
```env
# Database (already configured)
DB_HOST=72.60.202.106
DB_USER=appuser
DB_PASSWORD=App@1234
DB_NAME=auth_org_db

# SMTP (update with your credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Run Database Migration
Connect to your MySQL server and run:
```sql
source migrations/init.sql
```

Or run it via command line:
```bash
mysql -h 72.60.202.106 -u appuser -p auth_org_db < migrations/init.sql
```

### 4. Start the Server
```bash
npm run dev
```

Server will run on http://localhost:3000

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/forgot-password` | Request reset OTP |
| POST | `/api/auth/reset-password` | Reset with OTP |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| PUT | `/api/users/:id/role` | Assign role |
| PATCH | `/api/users/:id/status` | Update status |

### Roles (Super Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List orgs |
| POST | `/api/organizations` | Create org |
| PUT | `/api/organizations/:id` | Update org |
| DELETE | `/api/organizations/:id` | Delete org |

## Project Structure

```
auth-org-management/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, RBAC, validation
│   ├── routes/          # API routes
│   └── services/        # Email, OTP services
├── migrations/          # SQL migrations
├── .env                 # Environment config
├── server.js           # Entry point
└── package.json
```

## Default Roles

| Role | Code | Permissions |
|------|------|-------------|
| Super Admin | SUPER_ADMIN | Full access |
| Admin | ADMIN | Manage users, roles, orgs |
| Organization Admin | ORG_ADMIN | Manage own org |
| Staff | STAFF | Limited access |
| Volunteer | VOLUNTEER | Basic access |
| Sponsor | SPONSOR | View access |

## Testing with cURL

### Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234","fullName":"Test User"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'
```
