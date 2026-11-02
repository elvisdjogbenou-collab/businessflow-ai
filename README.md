# BusinessFlow AI

BusinessFlow AI is an early-stage SaaS concept for small businesses to manage prospects, customers, orders, recorded payments, balances, and follow-ups.

## Current status
Phase 0 product and architecture documentation has been initialized in [docs/](docs/).

## Development decisions
- Next.js App Router
- Strict TypeScript
- Tailwind CSS
- Supabase Auth/PostgreSQL
- Row Level Security
- Zod
- Vitest and Playwright

## Protected operations
No paid service, production configuration, DNS/domain change, real payment, real customer messaging, advertising, secret rotation, destructive database operation, or production deployment may be performed without explicit authorization.

## Local setup
1. Install Node.js 24 and pnpm 11.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local`.
4. Configure a Supabase development project and set only the documented public URL and anonymous key.
5. Apply `supabase/migrations/202611020001_initial_schema.sql` to a local or development Supabase database.
6. Run `pnpm dev`.

## Verification status
- TypeScript typecheck passes.
- Vitest domain and unauthenticated API guard tests pass locally.
- The Next.js production build passes.
- ESLint passes with the Next 15 legacy configuration.
- HTTP 200 smoke tests pass locally for `/`, `/login`, and `/signup`; no Supabase service is required for those pages.
- Installation is reproducible with pnpm 11 and the committed pnpm lockfile.
- End-to-end tests have not been run because Playwright and a configured Supabase development project are not available.
- The initial schema enables RLS and organization-member policies; cross-tenant isolation still requires explicit integration tests.
