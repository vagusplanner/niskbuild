# North South Consulting

First-party NiskBuild product (Vite SPA). Ported from a Base44 export; **not** linked to Base44 GitHub sync.

- Source of truth for migration: this directory inside `nisk-build-core`
- Do **not** push product changes to `github.com/vagusplanner/north-south-consulting`

## Develop

```bash
# from monorepo root
npm run dev:ns
```

Requires NiskBuild API on `:3000` for `/api` proxy (same pattern as Vagus Planner).

## Phase status

- **Phase 0:** scaffolded without `@base44/*`; stub `base44Client` until Supabase compat
- **Phase 1:** draft SQL in `supabase/ns-*-migration.sql` (not applied)
