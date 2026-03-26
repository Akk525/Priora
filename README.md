# Priora (Stage 2 Prototype)

Priora is a local-first Kanban/task management prototype for CS348 with a React + TypeScript frontend, Node/Express + TypeScript backend, and PostgreSQL as the single source of truth via raw SQL (`pg`).

## Stack
- Frontend: React + TypeScript + Vite (`client`), Tailwind CSS, Lucide icons
- Backend: Node.js + Express + TypeScript (`server`)
- Database: PostgreSQL
- DB Access: raw SQL with parameterized queries via `pg`

## Project Structure
- `client/` React app at `http://localhost:5173`
- `server/` Express API at `http://localhost:4000`
- `server/migrations/` SQL schema + indexes

## Setup
1. Create database:
   - `createdb priora`
   - If Homebrew Postgres is installed and not running: `brew services start postgresql@15`
2. Configure env files:
   - `cp server/.env.example server/.env`
   - `cp client/.env.example client/.env`
   - On macOS Homebrew installs, set `DATABASE_URL` username to your local mac user (example: `postgres://akk@localhost:5432/priora`)
3. Install dependencies:
   - `npm run install:all`
4. Run migrations:
   - `npm run migrate`
5. Seed demo data:
   - `npm run seed`
6. Start backend:
   - `npm run dev`
7. In another terminal, start frontend:
   - `npm run dev:client`

## Demo Accounts
- `demo@priora.local` / `password123`
- `alex@priora.local` / `password123`

## Stage 2 Rubric Mapping
- Requirement 1 (`cards` main table): add/edit/delete cards from Kanban UI and API.
- Requirement 2 (report): `/reports/cards` with filters and summary counts.
- Dynamic DB-driven UI:
  - board selector from `/boards`
  - columns/categories from `/boards/:boardId/columns|categories`
  - assignees from `/boards/:boardId/members`
  - invitation inbox from `/invitations/me`

## UI Features
- Auth page for login/register/logout
- Board context bar with role badge and board selector
- Tabs: Kanban, Dashboard, Report, Archive, Members
- Kanban card create + full edit modal + delete + archive
- Category Manager (create/edit/delete)
- Members and invitations management
- Report metrics tiles + filtered cards table

## Demo Script (5-15 minutes)
1. Login as `demo@priora.local`.
2. Open `Kanban` and create a new card in a selected column/category/assignee.
3. Edit the same card via modal (title, priority, due date), then save.
4. Delete another card to demonstrate full CRUD on `cards`.
5. Open `Report`, apply filters (column/category/priority/date), and run report.
6. Return to `Kanban`, modify/archive a card, then rerun report to show changed totals.
7. Open `Members` tab, send an invitation, and show pending invitation list behavior.
8. Open `Archive` tab and restore an archived card.

## Security and Authorization Notes
- Protected routes require session authentication.
- Board roles are enforced server-side:
  - `viewer`: read-only
  - `member`: card/comment mutations
  - `admin`: member/invitation/column/category management
  - `owner`: full control
- Report and invitation acceptance now verify board membership/invited email context on the server.

## API Coverage
Implemented endpoints include:
- Auth: register/login/logout/me
- Boards: list/create/get/update/delete
- Members & invites: list/update/remove + invite send + inbox + accept/reject
- Columns/Categories: CRUD (+ column reorder)
- Cards: list/create/update/delete/move/archive/restore
- Comments: create/update/delete
- Analytics/Report: board analytics + filtered cards report

## AI Usage
AI assistance was used to scaffold boilerplate, generate SQL migrations, route handlers, and frontend wiring. All database interactions are explicit raw SQL using parameterized placeholders and were reviewed for Stage 2 constraints.
