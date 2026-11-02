# Database

## Core entities
- Organizations
- Users and organization memberships
- Customers and prospects
- Interactions
- Products, optional in a later MVP iteration
- Orders and order items
- Payments
- Follow-up tasks
- Invitations and audit events

## Data integrity
Use PostgreSQL foreign keys and transactional server functions for payments and order totals. Money is stored as integer minor units, never floating-point values. Currency is organization-scoped.

## Isolation
Every organization-owned table includes organization_id and RLS policies. Access is based on the authenticated user and their membership role. Authorization must be tested with users from two organizations.

## Initial migration
`supabase/migrations/202611020001_initial_schema.sql` creates the tenant tables, organization-member helper, indexes, and initial RLS policies. It has not been applied to any remote service and must not be applied to production without authorization.
