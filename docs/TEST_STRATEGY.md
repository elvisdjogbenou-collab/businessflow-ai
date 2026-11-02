# Test Strategy

## Layers
- Vitest for domain rules, utilities, and server-side functions.
- Integration tests for database operations and organization isolation.
- Playwright for critical end-to-end browser flows.
- ESLint and TypeScript checks in continuous integration.

## Mandatory regression cases
- Cross-organization access is blocked for all tenant resources.
- Payment totals cannot create negative balances outside valid configured behavior.
- Archiving does not delete business history.
- Order remaining balances remain consistent after payment changes.
- Authentication redirects protect private routes.
