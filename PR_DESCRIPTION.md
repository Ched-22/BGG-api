## Summary

- Add weekly operational report via email for all active `ADMIN` users every Sunday 08:00 (`Europe/Lisbon`).
- Metrics: quoted services, scheduled services, completed services, new clients, total revenue (EUR).
- Expose `GET /api/reports/weekly/preview` and `POST /api/reports/weekly/send` (ADMIN only).
- Staging override: `WEEKLY_REPORT_EMAIL_OVERRIDE=pedro@devdeals.app` until production SMTP is ready.

## API changes

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/reports/weekly/preview` | ADMIN | Preview metrics without sending |
| POST | `/api/reports/weekly/send` | ADMIN | Send report (`dryRun`, `force` optional) |

## New modules

- `src/mail/` — SMTP / stub sender when override is set without SMTP
- `src/weekly-reports/` — metrics, email template, cron, idempotency log

## Migration

- `WeeklyReportLog` table (`weekStart` unique) for send idempotency

## Env vars (`.env.example`)

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `WEEKLY_REPORT_CRON_ENABLED` (default `true`)
- `WEEKLY_REPORT_EMAIL_OVERRIDE` (staging: `pedro@devdeals.app`)

## Test plan

- [ ] Run migration: `npx prisma migrate deploy`
- [ ] `GET /api/reports/weekly/preview` as ADMIN — returns 5 KPIs
- [ ] `POST /api/reports/weekly/send` with `{ "dryRun": true }` — no email, `sentAt: null`
- [ ] `POST /api/reports/weekly/send` — email logged/sent to `pedro@devdeals.app` (with override)
- [ ] Repeat send same week → `409 Conflict` (use `{ "force": true }` to resend)
- [ ] `npm test` — weekly report unit specs pass
- [ ] `npm run build` passes
