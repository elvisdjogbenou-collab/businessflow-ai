# Phase 0 Audit Report

## Environment detected
- The original workspace contained only an empty Git repository.
- BusinessFlow AI was created at the user-authorized dedicated path.
- No application source, package manifest, environment configuration, migrations, or tests were present.
- Command execution through PowerShell is unavailable in the current tool session, so Git and package-manager verification could not be performed.

## Recommended stack
- Next.js App Router with strict TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- PostgreSQL Row Level Security
- Zod
- Vitest
- Playwright
- GitHub Actions when a repository is connected

The stack is suitable for a low-operational-cost, tenant-isolated monolith. External services remain isolated behind adapters and are not enabled for the MVP.

## Proposed architecture
Implement a modular monolith with server-owned domain logic and thin UI routes. Tenant authorization must be enforced by application checks and database RLS. Money uses integer minor units, and organization_id is mandatory on tenant-owned records.

## MVP scope
Organizations and roles, prospects and customers, interaction history, orders, manually recorded payments, balances, follow-ups, dashboard, and CSV exports.

## Priority risks
1. Tenant isolation failures.
2. Inaccurate payment or balance calculations.
3. Secrets or privileged configuration being exposed.
4. Hosting and database costs before product validation.
5. Feature growth outpacing maintainability.

## Dependencies and costs
No paid dependency is required for the design. Validation of Supabase hosting limits, preview environments, backup requirements, and domain/hosting prices is required before production.

## Decisions requiring authorization
- External paid services
- Production environment configuration
- DNS and domains
- Real payment activation
- Real customer communication
- Paid advertising
- Production deployment
- Destructive database operations
- Production secret rotation

## Phase 1 entry criteria
- A runnable repository with package scripts and versioned source.
- Authentication and organization schema.
- Development environment variables documented by name only.
- Migration and seed strategy established.
- Tests for tenant isolation, authentication, and permissions.
