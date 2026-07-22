# Lexora — IELTS Practice & Mock Test Platform

A full-stack IELTS preparation platform with practice tests, proctored mock tests, expert reviews, course videos, 1-on-1 bookings, and an admin dashboard. **All scoring for Writing & Speaking is human-based and credit-controlled — no AI evaluation.**

---

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router 6 |
| Backend  | Node.js, Express.js, TypeScript                                         |
| Database | MongoDB (via TypeORM)                                                   |
| Cache    | Redis (ioredis)                                                         |
| Auth     | JWT + Email OTP (2FA on every login) + Browser Fingerprinting           |

---

## Features

### Student

- **Practice Tests** — Listening, Reading, Writing, Speaking modules with auto-scoring for L/R
- **Mock Tests** — Proctored, timed, full-exam simulation with security controls (no mobile, no incognito, tab-switch tracking, copy/paste prevention, watermark overlay)
- **Expert Reviews** — Request human review for Writing/Speaking answers (costs 1 credit per review)
- **Courses** — Purchase and stream expert IELTS video lessons
- **1-on-1 Bookings** — Schedule personal sessions with IELTS experts
- **Support** — Create and manage support tickets with real-time messaging

### Admin

- User management (status, roles, credits)
- Review assignment queue
- Payment & credit ledger
- Booking management
- Support ticket oversight
- Audit logs

### Security

- Single-device login enforcement via browser fingerprint + Redis sessions
- Rate limiting on all endpoints
- Email OTP required on every login
- Mock test proctoring: mobile device blocking, incognito detection, copy/paste/screenshot prevention, custom watermark, tab-switch monitoring (3 max)

---

## Project Structure

```
lexora/
├── backend/
│   ├── src/
│   │   ├── config/          # env, database, redis
│   │   ├── entities/        # TypeORM entities (13 entities)
│   │   ├── middlewares/     # auth, rateLimit, deviceCheck, auditLogger, errorHandler
│   │   ├── modules/         # Feature modules (service/controller/routes each)
│   │   │   ├── auth/
│   │   │   ├── test-engine/
│   │   │   ├── review/
│   │   │   ├── payment/
│   │   │   ├── admin/
│   │   │   ├── support/
│   │   │   ├── course/
│   │   │   └── booking/
│   │   ├── types/
│   │   ├── utils/           # logger, otp, email, response, validators
│   │   └── index.ts         # Express entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance + API modules
│   │   ├── components/      # ui/ (Button, Input, Card, etc.) + layout/ (Navbar, MainLayout)
│   │   ├── hooks/           # Typed Redux hooks
│   │   ├── pages/           # All pages by feature
│   │   ├── store/           # Redux store + slices
│   │   ├── types/           # Shared TypeScript types
│   │   ├── utils/           # Security utilities
│   │   ├── App.tsx          # Route definitions
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- Redis

### Backend Setup

```bash
cd backend
cp .env.example .env        # Edit .env with your values
npm install
npm run dev                  # Starts on port 5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                  # Starts on port 3000, proxies /api → :5000
```

### Environment Variables

See `backend/.env.example` for all required environment variables:

| Variable                                           | Description               |
| -------------------------------------------------- | ------------------------- |
| `MONGODB_URI`                                      | MongoDB connection string |
| `REDIS_URL`                                        | Redis connection string   |
| `JWT_SECRET`                                       | JWT signing secret        |
| `JWT_EXPIRES_IN`                                   | Token expiry (e.g. `7d`)  |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email provider            |
| `OTP_EXPIRY_MINUTES`                               | OTP validity window       |
| `FRONTEND_URL`                                     | Frontend origin for CORS  |

---

## API Routes

| Prefix          | Module                                 |
| --------------- | -------------------------------------- |
| `/api/auth`     | Registration, Login, OTP, Profile      |
| `/api/tests`    | Practice & Mock tests, Attempts        |
| `/api/reviews`  | Request review, Get feedback           |
| `/api/payments` | Purchase credits/subscriptions         |
| `/api/admin`    | User/Review/Payment/Booking management |
| `/api/support`  | Support tickets                        |
| `/api/courses`  | Video courses                          |
| `/api/bookings` | 1-on-1 session bookings                |

---

## Key Design Decisions

1. **No AI** — Writing & Speaking evaluation is 100% human-reviewed. Listening & Reading are auto-scored using answer keys.
2. **Credit System** — Immutable ledger pattern (insert-only `CreditLedger` entries). Reviews cost 1 credit.
3. **Idempotent Payments** — Transaction ID uniqueness + Redis state machine prevents double-processing.
4. **Single-Device Login** — Browser fingerprint (canvas + screen + timezone + language SHA-256 hash) stored in Redis session; new login invalidates previous session.
5. **Test Proctoring** — Mock tests enforce desktop-only, no-incognito, no-copy/paste, watermark overlay, and max 3 tab-switches before auto-submit.

---

## Recent Frontend Changes — July 2026

### IELTS Practice Workspaces

- Added dedicated Section Practice and full Mock Practice workspaces.
- Added shared exam shell, timers, pause/submit/save controls, module progress,
  responsive question typography, and browser-local attempt progress.
- Added Listening, Reading, Writing, and Speaking practice interfaces.
- Added Practice/Simulation selection for individual Section modules.
- Added IELTS/UKVI-aware Cambridge catalog labels and Mock confirmation flow.
- Docker frontend is published locally on port `3100`.

### Mock Reading Exam UI

- Reworked the Reading section into an IELTS computer-test-inspired split view
  with resizable passage/question panes, part instructions, review flags,
  navigation arrows, and part-based question navigation.
- Added backend-driven matching-heading drag and drop. Empty numbered gaps are
  positioned through the relevant passage sections and become heading-only
  labels after an answer is dropped.
- Added passage text selection with floating **Note** and **Highlight** actions.
- Updated note/summary completion fields so their question number is visible
  only while the answer field is empty.

Detailed implementation and validation notes are available in
[`docs/task-logs`](docs/task-logs/).

---

## License

Private — All rights reserved.
