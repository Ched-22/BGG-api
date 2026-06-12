# feat(auth): allow technician view access in admin with role guards

## Feature Summary

Technicians can log into BGG-Admin and browse in read-only mode; quotes remain writable. API role guards enforce GET for technicians on tasks/inventory and restrict approve/delete on quotes.

**ClickUp task:** N/A

## Problem

- Technicians were blocked from the admin console after login.
- API returned 403 on tasks/inventory for technician JWTs.
- No server-side restriction on quote approve/delete for non-admins.

## Implementation Details

**API**
- `GET /tasks`, `GET /inventory/products` → `ADMIN` + `TECHNICIAN`
- `POST/PATCH/DELETE` on tasks, inventory → `ADMIN` only
- `quotes` controller: `RolesGuard` — approve/delete `ADMIN` only; create/update/submit both roles
- `clients`, `appointments`: GET both roles; writes `ADMIN` only

## Risk

**Low** — authorization tightening; no schema changes.

## Test plan

- [ ] Technician JWT: `GET /tasks` → 200, `PATCH /tasks/:id` → 403
- [ ] Technician: `POST /quotes` → 201, `PATCH /quotes/:id/approve` → 403
- [ ] Admin: full access unchanged
