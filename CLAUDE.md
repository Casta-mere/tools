# Tools Repository

A collection of small utility tools.

## Structure

- `firebase/` — Firebase Admin SDK utilities for user management

## Conventions

- Firebase scripts support `--prod` flag to switch from dev to production environment
- Firebase service account keys (`firebaseKey*`) are gitignored — never commit them
- Scripts are designed to work both as CLI tools and as importable Node.js modules
