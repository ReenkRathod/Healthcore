# Healthcare Appointment & Follow-up Manager

**Live Deployment**: [https://healtcare-appointment.vercel.app/](https://healtcare-appointment.vercel.app/)

A full-stack application for managing healthcare appointments, follow-ups, AI-generated visit summaries, medication reminders, and Google Calendar integration.

## Architecture

```
/
├── backend/        # Node.js + Express + TypeScript REST API
├── frontend/       # React + Vite (to be added)
└── docs/           # Project documentation
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 LTS |
| PostgreSQL | ≥ 14 |
| Redis | ≥ 7 |

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env       # Fill in your real values
npm install
npm run db:migrate         # Run Prisma migrations
npm run dev                # Start dev server
```

### Health Check

```
GET http://localhost:3000/api/v1/health
```

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all required configuration.

> **Never commit `.env` files containing real secrets.**

## Available Scripts (backend/)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run test suite |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run db:generate` | Regenerate Prisma client |

## Security

- All secrets must live exclusively in `.env` (never in source code)
- Errors returned to clients never contain stack traces, SQL, or credentials
- Requests are rate-limited and input is validated via Zod schemas
- HTTP headers are hardened via Helmet

## Development Test Accounts

> **LOCAL DEVELOPMENT / TESTING ONLY**

You can seed these accounts into your local database by running `npm run db:seed`.
They are intended to allow easy manual testing of all application roles.

### PATIENT
- **Email**: `patient.test@example.com`
- **Password**: `PatientTest@12345`

### DOCTOR
- **Email**: `doctor.test@example.com`
- **Password**: `DoctorTest@12345`

### ADMIN
- **Email**: `admin.test@example.com`
- **Password**: `AdminTest@12345`
