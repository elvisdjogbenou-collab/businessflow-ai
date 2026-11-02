# Deployment

## Initial target
A testable preview environment may use a hosted Next.js platform and Supabase project. Production deployment and DNS changes remain prohibited without explicit authorization.

## Release gates
- TypeScript and lint pass.
- Unit and integration tests pass.
- Database migrations are reviewed and reversible.
- Required environment variables are validated.
- Preview smoke tests pass.
- No secret or production credential is exposed.
