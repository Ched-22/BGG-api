## Summary

- Add technician profile fields on `User` and `/api/users/technicians` CRUD (paginated list, detail, soft-deactivate, `GET /me` for technicians).
- Compute KPIs (`completedCount`, `utilizationPercent`, `rating`) and `hasScheduleConflict` on the server; block duplicate `scheduledAt` on appointment create/update (`409`).
- Integrate BGG-Admin **Técnicos** page with the API; keep **Tarefas designadas** on `BGG_DATA.tasks` mock.

## Test plan

- [ ] Run migration: `npx prisma migrate deploy` (or `migrate dev`)
- [ ] Login as admin → Técnicos → list, create technician, open detail
- [ ] Verify appointments table in detail; tasks table still mock
- [ ] Create two appointments same `scheduledAt` for one technician → second returns `409`
- [ ] `npm test` / `npm run build` in `bgggarage-api`
- [ ] Technician JWT → `GET /api/users/technicians/me` returns own profile
