# Security

## Controls
- Implemented: Supabase server client uses public environment variables and the SSR cookie adapter.
- Implemented: login, signup, callback, sign-out routes use Zod for credential validation or server-side session handling.
- Implemented in SQL: PostgreSQL RLS and organization-member policies exist for tenant-owned tables.
- Implemented locally: integer minor-unit validation, customer validation, payment amount/date validation, and remaining-balance helpers.
- Not verified: real authenticated session flows, cross-organization denial, role enforcement, migrations, and transaction safety.
- Not implemented: centralized mutation authorization for all business resources, CSRF controls beyond framework behavior, rate limiting, audit logging, and service-role least-privilege configuration.

## Required checks
- Cross-organization read and mutation attempts are denied.
- Roles cannot exceed their assigned permissions.
- Authentication callbacks and password recovery reject invalid sessions safely.
- Production configuration excludes test credentials and debug logging.
- CSV exports neutralize spreadsheet formula prefixes.
- Prepared migration `202611020002_mvp_hardening.sql` replaces broad member mutation policies with owner/manager mutations and locks the order row while checking payment balances.
- These SQL controls are not executed or integration-tested without a running local Supabase/PostgreSQL environment.
