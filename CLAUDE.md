# Tools Repository

A collection of small utility tools.

## Structure

- `firebase/` — Firebase Admin SDK utilities for user management
- `mongo/` — MongoDB connection utilities and query runner
- `hrm/` — HRM version lookup utilities
- `grafana/` — Grafana connectivity and API query utilities
- `.claude/commands/` — Custom slash commands installed by `setup.sh`
- `.claude/skills/` — Custom skills installed by `setup.sh`
- `.claude/memory/` — Persistent memory for this repo (checked in, travels with the repo)

## Current commands

- `hrm-version` — Look up HRM frontend and backend versions from portal and gitops for both dev and prod
- `mongo` — Query MongoDB databases and collections
- `mongo-update` — Update MongoDB documents with mandatory preview and confirmation
- `portal-user` — Look up portal users in MongoDB by email, userId, or businessId
- `grafana` — Connect to Grafana and query Grafana HTTP APIs

## Current skills

- `firebase` — Firebase user management for lookup, listing, and profile or role updates

## Conventions

- Firebase scripts support `--prod` flag to switch from dev to production environment
- Firebase service account keys (`firebaseKey*`) are gitignored — never commit them
- Mongo scripts support `--prod` flag to switch between dev/prod MongoDB URLs
- Mongo connection URLs are stored in `mongo/.env` (gitignored — never commit it)
- Scripts are designed to work both as CLI tools and as importable Node.js modules
- Custom `.claude/commands/*.md` and `.claude/skills/*.md` files should use `{{REPO_ROOT}}` in executable paths; `setup.sh` replaces it with the actual repo path during installation
- When a new `.claude` skill or command is added or an existing one is modified and the user approves it, update both `README.md` and `CLAUDE.md` to keep repo documentation aligned
