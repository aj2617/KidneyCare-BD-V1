# KidneyCare BD

KidneyCare BD is a role-based chronic kidney disease (CKD) monitoring and decision-support platform for Bangladesh. It combines patient tracking, doctor workflows, education content, risk scoring, GFR calculation, and an admin-facing public health dashboard in a single application.

This repository is designed so future contributors can understand both the product goal and the implementation quickly. If you need a deeper technical walkthrough, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project Purpose

The project addresses three operational needs:

- Patients need a simple way to monitor CKD-related indicators, understand risk, and review educational content.
- Doctors need visibility into their patients, alerts, and trend data for follow-up decisions.
- Administrators and public health stakeholders need district-level summaries, research exports, and policy-oriented reports.

In short, the application connects individual clinical monitoring with population-level reporting.

## Main Features

- Public landing page with product overview and role-oriented onboarding.
- Authentication with separate flows for `patient`, `doctor`, and `admin`.
- Patient profile management, vitals logging, GFR calculation, risk scoring, education content, and cost planning.
- Doctor dashboard with patient lists, alert review, and patient detail inspection.
- Admin dashboard with CKD heatmap, research CSV export, and generated policy reports.
- Built-in demo seed data for presentations, testing, and evaluation.

## Technology Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Motion, React Leaflet
- Backend: Express running in the same project
- Database: SQLite via `better-sqlite3`
- Authentication: JWT
- Password hashing: `bcryptjs`

## How The App Is Structured

- `src/App.tsx`
  Main client-side controller. Decides which page to render based on login state and role.
- `src/pages/`
  Role-specific UI screens and public pages.
- `src/contexts/AuthContext.tsx`
  Stores login state and JWT token on the client.
- `src/contexts/LanguageContext.tsx`
  Handles English/Bangla label switching.
- `server.ts`
  Express server, database initialization, seed data, and all API routes.
- `kidneycare.db`
  Local SQLite database file used during development.
- `docs/ARCHITECTURE.md`
  Detailed implementation notes for maintainers and project explanation.

## Role-Based Product Flow

### Patient

- Registers or logs in
- Completes profile details
- Logs vitals
- Calculates GFR
- Receives risk score and recommendations
- Uses education and cost-planning tools

### Doctor

- Logs in
- Reviews assigned or all patients
- Opens individual patient details
- Reviews alerts created from vitals trends

### Admin

- Logs in
- Reviews district-level heatmap data
- Exports research-ready CSV data
- Downloads generated policy reports and national summary report

## Local Setup

### Prerequisites

- Node.js 18+ recommended
- npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy environment values if needed. The project already falls back to local defaults for development, but `.env.example` documents the expected variables.

3. Start the app:

```bash
npm run dev
```

`npm run dev` now starts the production server wrapper (`start-prod.ts`), which keeps the app boot path stable on Windows and serves the built frontend from `dist`.

If `dist/` is missing in a fresh checkout, run `npm run build` once before `npm run dev`.

If you want the backend-only source server, use `npm run start:dev`.

### Other Useful Commands

```bash
npm run lint
npm run build
npm run start
```

## Railway Deployment

This repository is now prepared for Railway deployment with SQLite persistence.

### What is already configured

- `railway.json` defines the Railway build and start commands
- `server.ts` reads `PORT` automatically
- `server.ts` supports `DATABASE_PATH`
- `server.ts` also supports `RAILWAY_VOLUME_MOUNT_PATH`, which Railway exposes for mounted volumes
- `/healthz` is available for health checks
- the database seeds itself automatically on first boot if the file is empty
- the production start path now runs with `NODE_ENV=production` by default
- `JWT_SECRET` is recommended, but if it is missing the app generates a persisted fallback secret in SQLite so the service can still boot cleanly

### Why a volume is required

SQLite stores data in a local file. Railway services need a mounted volume if you want that file to persist across restarts and deployments.

### Deploy steps

1. Push the repository to GitHub
2. In Railway, create a new project from the GitHub repository
3. Let Railway detect the app using `railway.json`
4. Add a volume to the service
5. Mount the volume to a path such as `/data`
6. Set either:
   - `DATABASE_PATH=/data/kidneycare.db`
   - or rely on `RAILWAY_VOLUME_MOUNT_PATH` and let the app create `kidneycare.db` there automatically
7. Set `NODE_ENV=production`
8. Set `JWT_SECRET` to a long random string if you want the secret to live outside the database
9. Deploy

On the first deploy, the app will create the database file and seed demo users and sample patient data automatically.

### Important environment values on Railway

- `NODE_ENV=production`
- `JWT_SECRET=<generated secret>` or let the app persist one automatically in the SQLite database
- Optional: `DATABASE_PATH=/data/kidneycare.db`

If you attach a Railway volume and mount it to `/data`, using `DATABASE_PATH=/data/kidneycare.db` is the clearest setup.

## Demo Credentials

These are auto-seeded when the database is empty:

- Admin
  `admin@kidneycare.bd` / `password123`
- Doctor
  `doctor@kidneycare.bd` / `password123`

Additional demo patient accounts are also seeded across multiple districts.

## Database Notes

The database schema is created automatically in `server.ts` at startup. Main tables:

- `users`
- `patients`
- `vitals_log`
- `gfr_records`
- `alerts`
- `articles`

The app uses a deliberately simple schema so it is easy to demonstrate and easy for students or new contributors to extend.

For Railway deployment, the same schema and seed flow are used. The only difference is that the SQLite file should live on the mounted Railway volume path instead of the project root.

## API Overview

Examples of main route groups:

- `/api/auth/*`
- `/api/patient/*`
- `/api/doctor/*`
- `/api/admin/*`
- `/api/articles`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a route-by-route explanation.

## Notes For Future Contributors

- The project currently uses simple page-state routing in `src/App.tsx` instead of React Router.
- The backend and frontend are intentionally kept in one repository to simplify demos and deployment.
- Several calculations and alerts are simplified for academic/demo purposes and can be replaced with more clinically rigorous logic later.
- Seed data is important for demos. Be careful not to remove it unless you replace it with a proper fixture strategy.
- The admin reporting layer is generated from live database aggregates rather than stored report files.

## Questions A Supervisor May Ask

### What problem does this system solve?

It supports early CKD detection and monitoring by combining patient self-management, doctor oversight, and public health reporting in one platform.

### Why are there three user roles?

CKD care involves different stakeholders with different information needs. Patients need monitoring, doctors need clinical visibility, and administrators need aggregated district-level insights.

### Why use SQLite?

SQLite keeps the project simple, portable, and easy to demonstrate without requiring a separate database server. It is appropriate for a prototype, academic project, or lightweight deployment.

### How is risk calculated?

The current risk engine uses a simplified weighted model based on age, sex, diabetes, hypertension, family history, and a district-based rural proxy. It is intentionally understandable and easy to improve later.

### How are the admin reports produced?

The reports are generated dynamically from district-level patient and risk data, then exported as Markdown or CSV so they can be reviewed or submitted externally.

### Why is the frontend not using a full routing library?

The current approach keeps the codebase smaller and easier to explain in an academic context. If the project grows, React Router would be a logical next step.

## Recommended Future Improvements

- Replace manual page switching with React Router
- Move business logic out of `server.ts` into services/modules
- Add validation for request bodies
- Add unit and integration tests
- Improve Bangla text encoding consistency in seeded content
- Add role-based audit logging
- Replace generated demo reporting with persistent reporting history if required

## Maintainer Guidance

If you are extending the project:

- read `server.ts` before changing backend behavior
- read `src/App.tsx` before adding new pages or role navigation
- keep new code role-aware
- document any new API endpoint in the architecture doc
- prefer small, clear feature additions over tightly coupled changes
