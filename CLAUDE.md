# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent npm projects (no root `package.json`, no workspaces):

- `backend/` — Node.js + Express 5 + Mongoose 9 REST API (CommonJS, plain JS)
- `frontend/` — Create React App (react-scripts 5) + React 19 + TypeScript + Tailwind CSS 3

Run all npm commands from inside the relevant subdirectory. Deployment: MongoDB Atlas, backend on Railway, frontend on Vercel. Vercel's build fails on ESLint warnings (CRA treats warnings as errors when `CI=true`), so keep the frontend lint-clean.

## Commands

### Backend (`cd backend`)
```bash
npm run dev            # nodemon server.js (nodemon is not in devDependencies; install globally or use npx)
npm start              # node server.js
npm test               # jest --runInBand --forceExit
npm run test:coverage
npx jest __tests__/integration/tasks.routes.test.js          # single file
npx jest -t "should return only the current user tasks"      # single test by name
```
Tests are integration tests against a **real MongoDB** (Supertest + `app.js`), using `MONGO_URI_TEST` (falls back to `MONGO_URI`) from `backend/.env`. Test files `deleteMany({})` collections after each test — never point `MONGO_URI_TEST` at a database with data you care about. Tests must run serially (`--runInBand`).

### Frontend (`cd frontend`)
```bash
npm start              # dev server on :3000
npm run build
npm test               # react-scripts test (Jest, watch mode)
CI=true npm run build  # reproduce Vercel's lint-as-error build
```
`src/App.test.tsx` is the stale CRA boilerplate test ("learn react") and will fail.

### Docker
`docker compose up --build` from the repo root starts `mongo` (mongo:6), `backend` (:5000, reads `backend/.env`) and `frontend` (:3000). Inside compose, `MONGO_URI` must use host `mongo`.

## Environment

- `backend/.env` (see `backend/.env.example`): `PORT`, `MONGO_URI`, `MONGO_URI_TEST`, `JWT_SECRET`, `SMTP_HOST/PORT/USER/PASS/FROM`. Also `FRONTEND_URL` (used in email links, defaults to `http://localhost:3000`; not in the example file).
- `frontend/.env`: `REACT_APP_API_URL` (defaults to `http://localhost:5000`).

## Backend architecture

- `app.js` builds the Express app and mounts routers (`/api/auth`, `/api/tasks`, `/api/items`, `/api/workspaces`) **without** connecting to Mongo or listening — this is what tests import. `server.js` connects the DB, starts background schedulers, and listens.
- Background jobs (started in `server.js`, `setInterval` hourly, in-process — no external queue):
  - `services/notificationScheduler.js` — emails due-date reminders (tasks not done, due ≤3 days) via `services/emailService.js` (nodemailer), and also calls the recurring-task check.
  - `services/recurringTaskService.js` — when a recurring task is `done`, creates the next occurrence (linked by `parentTaskId`, guarded by `lastRecurredDate`). Also callable on demand via `POST /api/tasks/:id/generate-next`.
- Auth: `middleware/auth.js` `protect` verifies a `Bearer` JWT and sets `req.user` (password excluded). `tasks` and `workspaces` routers apply it via `router.use(protect)`. `routes/items.js` is an unprotected leftover CRUD example.
- **Task model is a single document with embedded arrays**: `comments`, `subtasks`, `attachments`, and `history` all live inside the Task (`models/Task.js`). Sub-resources are separate routes (`/api/tasks/:id/comments`, `/subtasks`, `/attachments/:filename`, `/assign`, `/recurrence`) that mutate the parent and save it.
- **Audit history**: every mutating task route calls `addHistory(task, req.user, action, description, field, old, new)` from `utils/taskHistory.js`. `action` must be one of the enum values in `historySchema` — add to the enum when introducing a new kind of change.
- **Access control**: `canAccessTask` in `routes/tasks.js` — a user can access a task if they own it or are a member of its workspace. `GET /api/tasks` returns personal tasks (`user = me, workspace = null`) by default, or all tasks of a workspace with `?workspaceId=`. Workspace roles are `owner | admin | member` (`models/Workspace.js` helpers `isMember`, `getMemberRole`); owner/admin is required for update/invite operations. Assignees must be workspace members.
- **Workspace invites** are embedded in the Workspace doc with a random token; email links point to `${FRONTEND_URL}/accept-invite?token=...`, accepted via `POST /api/workspaces/accept-invite`.
- **File uploads**: `config/multer.js` stores files on local disk in `backend/uploads/` (5MB limit, 5 files, images/PDF/Office/txt only). Task create/update accept `multipart/form-data`, so non-file fields arrive as strings — `labels` is JSON-stringified and booleans like `isRecurring` are compared against `'true'`. Keep this in sync with `frontend/src/services/api.ts`.

## Frontend architecture

- No router in use despite `react-router-dom` being installed: `App.tsx` switches between `Login`/`Register`, `AcceptInvite` (detected from `window.location`), and `pages/Dashboard.tsx` based on auth state.
- Auth state is the API response stored in `localStorage['user']` (`services/authService.ts`); the axios instance in `services/api.ts` attaches `Authorization: Bearer <token>` via an interceptor.
- `services/api.ts` holds all API calls (`taskService`, `workspaceService`, …) and builds `FormData` for task create/update.
- `pages/Dashboard.tsx` owns essentially all app state (tasks, filters, sort, search, dark mode, active workspace) and renders the Kanban board with `@dnd-kit` (drag between `todo` / `in-progress` / `done` updates status). Feature panels (`Statistics` via recharts, `CalendarView`, `ExportImport`, `WorkspacePanel`, `TaskDetails`, `TaskForm`) are components toggled from it.
- Shared types live in `src/types/` (`task.ts`, `user.ts`, `workspace.ts`) and mirror the Mongoose schemas — update both sides when changing a model.
