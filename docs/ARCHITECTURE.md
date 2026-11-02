# Architecture

## Selected direction
Use a modular Next.js monolith with the App Router, strict TypeScript, Tailwind CSS, PostgreSQL, and Supabase. Server-side domain logic is kept outside React components; authorization is enforced both in application code and PostgreSQL RLS policies.

## Rationale
This stack minimizes infrastructure operations for an early-stage product while providing hosted authentication, database access, storage primitives, and Row Level Security.

## Initial modules
- Identity and organizations
- Users and permissions
- Prospects and customers
- Orders
- Payments
- Follow-ups
- Dashboard and reports
- Integrations, isolated behind adapters

## Boundaries
External services are accessed through server-side adapters. UI components do not perform direct authorization-critical database operations.
