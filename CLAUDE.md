# Tools Repository

A collection of small utility tools.

## Structure

- `firebase/` — Firebase Admin SDK utilities for user management
- `mongo/` — MongoDB connection utilities and query runner

## Conventions

- Firebase scripts support `--prod` flag to switch from dev to production environment
- Firebase service account keys (`firebaseKey*`) are gitignored — never commit them
- Mongo scripts support `--prod` flag to switch between dev/prod MongoDB URLs
- Mongo connection URLs are stored in `mongo/.env` (gitignored — never commit it)
- Scripts are designed to work both as CLI tools and as importable Node.js modules
