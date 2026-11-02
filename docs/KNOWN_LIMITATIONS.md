# Known Limitations

Phase 0 establishes the product and technical baseline only. Authentication, domain models, migrations, UI, integrations, and commercial launch remain unimplemented until their respective phases.

The working shell can execute package installation and command-based verification in this workspace.

## Implementation status
- Verified locally as files by direct inspection: initial Next.js structure, authentication routes, dashboard shell, and SQL migration.
- Verified: dependency installation with pnpm, strict TypeScript, local unit/API guard tests, and the Next.js production build.
- Not verified at runtime: authentication against a real Supabase project, database migration, RLS isolation tests, and browser rendering.
- Previous startup attempts could appear slow because first-route compilation was allowed too little time; local HTTP smoke tests are now documented separately.
- Server diagnosis: Node 24, pnpm 11 and Next 15.5.28 are available. Port 3000 and 3100 were initially free. Direct Next development startup on 127.0.0.1:3100 was slow, first compiled on demand, and then served `/`, `/login`, and `/signup`; the temporary server has been stopped.
- Verified after the dependency repair: `pnpm lint` exits successfully, `pnpm typecheck` exits successfully, 7 unit tests pass, and `pnpm build` completes with exit code 0.
- The development dependency `es-abstract@1.24.2` is declared explicitly because legacy ESLint React dependencies resolve ECMA-2024/2025 helpers through this package. This version was already present in the lockfile's transitive resolution; no override was added.
- The development server was verified on port 3100 with HTTP 200 responses for `/`, `/login`, and `/signup`. The temporary server was stopped and no listener remained on port 3100.
- Organization creation and invitation flows are not implemented.
- Local organization bootstrap is prepared in migration `202611020002_mvp_hardening.sql`; it has not been applied or runtime-tested.
- Orders, line items, recorded manual payments, follow-up tasks, live dashboard aggregates, and CSV export now have application routes/shells, but Supabase remains unconfigured and database behavior is not runtime-verified.
- Payment overbalance enforcement is implemented locally and in a prepared PostgreSQL trigger; neither has been integration-tested.
- Cross-organization integration tests are not implemented yet.
- Docker CLI is available, but no Docker engine daemon and no local Supabase Docker environment are running, so migrations and cross-tenant RLS tests remain unverified at runtime.
