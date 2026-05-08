# Team Permissions & Audit Log Design

## Problem
The app has no access control — every logged-in user can see and modify everything. We need role-based access for teams, plus an audit trail for compliance.

## Design

### Roles & Permissions
Three roles: `viewer` (read-only), `editor` (create/edit), `admin` (full control including user management).

### Data model
- `Team` — `id`, `name`, `createdAt`
- `TeamMember` — `teamId`, `userId`, `role` (enum: viewer/editor/admin), `addedAt`
- `AuditLog` — `id`, `teamId`, `userId`, `action`, `resource`, `details` (JSON), `createdAt`

### API
**Team management:**
- `POST /teams` — create team (creator becomes admin)
- `GET /teams` — list user's teams
- `POST /teams/:id/members` — add member (admin only)
- `PATCH /teams/:id/members/:userId` — change role (admin only)
- `DELETE /teams/:id/members/:userId` — remove member (admin only)

**Resource scoping:**
- All existing CRUD endpoints get team scoping via `?teamId=`
- Permission middleware checks role before allowing operations

**Audit:**
- `GET /teams/:id/audit` — list audit entries (admin only)
- Every mutating action writes to audit log automatically

### UI
- Team settings page (manage members, roles)
- Audit log viewer (filterable by action, user, date)
- Team switcher in nav bar

### Tech stack
- Backend: Express + SQLite (better-sqlite3)
- Tests: vitest
- Auth: existing session middleware in `src/middleware/auth.ts`
- Existing patterns: `src/db.ts`, `src/routes/`, `src/middleware/`
