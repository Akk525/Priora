# Priora

Priora is a full-stack Kanban and task management application built for the CS348 semester project. It uses a React + TypeScript frontend, an Express + TypeScript backend, and PostgreSQL as the system of record. The project demonstrates database-backed CRUD workflows, dynamic UI population from database data, filtered reporting, SQL injection protection, index-aware query design, transactions, and cloud deployment.

## Live Project
- Live app: `https://priora-full-production.up.railway.app`
- GitHub repository: `https://github.com/Akk525/Priora`

## Demo Accounts
- `demo@priora.local` / `password123`
- `alex@priora.local` / `password123`

## Tech Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express 5, TypeScript
- Database: PostgreSQL
- Database access: raw SQL via `pg`
- Validation: `zod`
- Hosting: Railway

## Core Features
- User registration, login, logout, and session-based authentication
- Multiple boards with board-level roles: owner, admin, member, viewer
- Kanban workflow with drag-and-drop card ordering
- Card create, edit, archive, restore, and delete flows
- Category and board member management
- Invitation workflow for adding users to boards
- Dynamic report filtering by board data from PostgreSQL
- Dashboard, calendar, archive, and timeline views

## Stage 2 Coverage

This project satisfies the Stage 2 requirements in the following ways:

### Requirement 1: Insert, Update, Delete
- Cards can be created, edited, archived/restored, and deleted from the Kanban workflow.
- Categories and board members can also be created or modified through the UI.
- All mutations are persisted in PostgreSQL and reflected immediately in the UI.

### Requirement 2: Filtering and Reporting
- The report view supports filtering by:
  - column
  - category
  - assignee
  - priority
  - archived status
  - due date range
- The filtered cards table and report summary update based on live database data.
- The report can be shown before and after data changes to demonstrate database-backed updates.

### Dynamic UI Built from Database Data
- The frontend dynamically loads boards, columns, categories, assignees, and invitations from the backend.
- Filter dropdowns and selectors are populated from PostgreSQL-backed API responses rather than hard-coded constants.
- Relevant code:
  - API client: [client/src/services/api.ts](/Users/akk/Documents/CS 348/Priora/client/src/services/api.ts)
  - Main app state loading: [client/src/App.tsx](/Users/akk/Documents/CS 348/Priora/client/src/App.tsx)
  - Report UI: [client/src/components/ReportView.tsx](/Users/akk/Documents/CS 348/Priora/client/src/components/ReportView.tsx)

## Stage 3 Coverage

### SQL Injection Protection
- Priora uses parameterized SQL queries with PostgreSQL placeholders such as `$1`, `$2`, and `$3`.
- User inputs are never interpolated directly into SQL query strings.
- Request payloads are also validated with `zod` before queries execute.

Examples:
- Login query: [server/src/routes/auth.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/auth.ts)
- Filtered report query: [server/src/routes/reports.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/reports.ts)
- Card mutations: [server/src/routes/cards.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/cards.ts)

### Indexes

Indexes are defined in [server/migrations/004_indexes.sql](/Users/akk/Documents/CS 348/Priora/server/migrations/004_indexes.sql).

- `idx_users_email ON users(lower(email))`
  - Supports case-insensitive login lookup in [server/src/routes/auth.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/auth.ts)

- `idx_sessions_user_id ON sessions(user_id)`
  - Supports session-related lookups and cleanup for authenticated users

- `idx_board_members_user_lookup ON board_members(user_id, board_id)`
  - Supports board list loading and role/membership checks in:
    - [server/src/routes/boards.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/boards.ts)
    - [server/src/middleware/auth.ts](/Users/akk/Documents/CS 348/Priora/server/src/middleware/auth.ts)

- `idx_cards_board_archived ON cards(board_id, archived)`
  - Supports board card loading, archive view, and archived/active reporting

- `idx_cards_column_position ON cards(column_id, position)`
  - Supports ordered Kanban rendering and drag/drop workflows

- `idx_invites_email_status ON board_invitations(lower(email), status)`
  - Supports invitation inbox lookup and invitation workflow queries

- `idx_cards_assignee ON cards(assignee_id)`
  - Supports assignee-based filtered reporting

- `idx_cards_due_date ON cards(due_date)`
  - Supports due-date range filtering and overdue reporting

### Transactions and Isolation Levels
- Board creation is wrapped in a transaction so board creation, ownership membership insertion, and default column creation either all succeed or all fail.
- Invitation acceptance is wrapped in a transaction so invitation status changes and board membership updates remain consistent.
- Both transactional flows explicitly use `BEGIN ISOLATION LEVEL READ COMMITTED`.

Relevant code:
- Board creation transaction: [server/src/routes/boards.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/boards.ts)
- Invitation acceptance transaction: [server/src/routes/invitations.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/invitations.ts)

Why `READ COMMITTED`:
- It is a practical isolation level for a web application with short OLTP-style transactions.
- It prevents reading uncommitted data.
- It has lower concurrency overhead than stronger levels such as `SERIALIZABLE`.

## Architecture

### Frontend
- The frontend is a single-page React application in [client](</Users/akk/Documents/CS 348/Priora/client>).
- It uses a central app shell in [client/src/App.tsx](/Users/akk/Documents/CS 348/Priora/client/src/App.tsx) to manage:
  - authentication state
  - selected board state
  - board, card, category, member, and report data

### Backend
- The backend is an Express API in [server](</Users/akk/Documents/CS 348/Priora/server>).
- Routes are organized by feature:
  - auth: [server/src/routes/auth.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/auth.ts)
  - boards: [server/src/routes/boards.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/boards.ts)
  - cards: [server/src/routes/cards.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/cards.ts)
  - reports: [server/src/routes/reports.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/reports.ts)
  - invitations: [server/src/routes/invitations.ts](/Users/akk/Documents/CS 348/Priora/server/src/routes/invitations.ts)
- In production, Express serves the built frontend from `client/dist` so the app runs on a single origin.

### Database
- PostgreSQL is the single source of truth.
- Schema and indexes are created through SQL migrations in [server/migrations](</Users/akk/Documents/CS 348/Priora/server/migrations>).
- Database access is done using raw SQL through `pg`, not an ORM.

## Database Design

### Core Tables
- `users`
- `sessions`
- `boards`
- `board_members`
- `board_invitations`
- `columns`
- `categories`

### Card-Related Tables
- `cards`
- `card_labels`
- `card_dependencies`
- `card_comments`
- `completion_records`

### Primary Keys and Foreign Keys

- `users(id)` is referenced by:
  - `sessions.user_id`
  - `boards.owner_id`
  - `board_members.user_id`
  - `board_invitations.invited_by_user_id`
  - `cards.assignee_id`
  - `card_comments.author_id`
  - `completion_records.assignee_id`

- `boards(id)` is referenced by:
  - `board_members.board_id`
  - `board_invitations.board_id`
  - `columns.board_id`
  - `categories.board_id`
  - `cards.board_id`
  - `completion_records.board_id`

- `columns(id)` is referenced by:
  - `cards.column_id`

- `categories(id)` is referenced by:
  - `cards.category_id`

- `cards(id)` is referenced by:
  - `card_labels.card_id`
  - `card_dependencies.card_id`
  - `card_dependencies.depends_on_card_id`
  - `card_comments.card_id`
  - `completion_records.card_id`

See:
- [server/migrations/001_extensions_and_enums.sql](/Users/akk/Documents/CS 348/Priora/server/migrations/001_extensions_and_enums.sql)
- [server/migrations/002_core_tables.sql](/Users/akk/Documents/CS 348/Priora/server/migrations/002_core_tables.sql)
- [server/migrations/003_card_related_tables.sql](/Users/akk/Documents/CS 348/Priora/server/migrations/003_card_related_tables.sql)

## API Overview

Implemented endpoints include:
- Auth: register, login, logout, me
- Boards: list, create, get, update, delete
- Members and invites: list, update, remove, send invite, inbox, accept, reject
- Columns and categories: CRUD, column defaults, column reorder
- Cards: list, create, update, delete, move, archive, restore
- Comments: create, update, delete
- Reports: board analytics and filtered cards report

## Local Development

### Prerequisites
- Node.js 20+
- npm
- PostgreSQL

### Setup
1. Create a local database:
   - `createdb priora`
2. Copy environment files:
   - `cp server/.env.example server/.env`
   - `cp client/.env.example client/.env`
3. Install dependencies:
   - `npm run install:all`
4. Run migrations:
   - `npm run migrate`
5. Seed demo data:
   - `npm run seed`
6. Start the backend:
   - `npm run dev`
7. Start the frontend in another terminal:
   - `npm run dev:client`

## Environment Variables

### Backend
Defined in [server/.env.example](/Users/akk/Documents/CS 348/Priora/server/.env.example)

- `PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `SESSION_SECRET`
- `SESSION_DAYS`

### Frontend
Defined in [client/.env.example](/Users/akk/Documents/CS 348/Priora/client/.env.example)

- `VITE_API_URL`

## Deployment

Priora is deployed on Railway as:
- one web service for the full app
- one PostgreSQL service for the database

Deployment files:
- [Dockerfile](/Users/akk/Documents/CS 348/Priora/Dockerfile)
- [railway.toml](/Users/akk/Documents/CS 348/Priora/railway.toml)
- [.dockerignore](/Users/akk/Documents/CS 348/Priora/.dockerignore)

Production setup notes:
- Express serves the built frontend in production.
- The frontend uses the same public origin as the backend.
- This avoids cross-domain session/cookie issues.
- The hosted PostgreSQL instance was migrated and seeded with demo data.

## Security Notes
- Session authentication uses an `HttpOnly` cookie.
- Protected routes require a valid session.
- Board role checks are enforced on the server.
- Parameterized SQL protects against SQL injection.
- Input validation is performed with `zod`.

## AI Usage

AI tools were used in this project in accordance with the course policy.

### Tools Used
- ChatGPT / Codex

### Tasks AI Assisted With
- debugging frontend and backend issues
- reviewing SQL queries and API route behavior
- refining deployment configuration for Railway
- drafting documentation and demo preparation material

### How AI Output Was Verified
- all AI-generated suggestions were reviewed manually
- code was modified to fit the project architecture
- builds were rerun after changes
- deployment changes were validated with Railway logs and live HTTP checks
- database behavior was verified with migrations, seeded data, and live auth/report testing

## Additional Project Notes
- A Stage 3-specific prep document is included at [STAGE3_PREP.md](/Users/akk/Documents/CS 348/Priora/STAGE3_PREP.md).
- The project currently demonstrates realistic multi-user concepts through board roles, invitation acceptance, and transaction-backed updates.
- Minor bugs or future improvements can be acknowledged in the final recorded demo if needed.
