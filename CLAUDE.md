# Tools Repository

A collection of small utility tools.

## Structure

- `firebase/` — Firebase Admin SDK utilities for user management
- `mongo/` — MongoDB connection utilities, query runner, and portal-user permission resolver
- `hrm/` — HRM version lookup utilities
- `grafana/` — Grafana connectivity and API query utilities
- `.claude/commands/` — Custom slash commands installed by `setup.sh`
- `.claude/skills/` — Custom skills installed by `setup.sh`
- `.claude/memory/` — Persistent memory for this repo (checked in, travels with the repo)

## Current commands

- `hrm-version` — Look up HRM frontend and backend versions from portal and gitops for both dev and prod
- `mongo` — Query MongoDB databases and collections
- `mongo-update` — Update MongoDB documents with mandatory preview and confirmation; includes permission-aware workflow for portal users
- `portal-user` — Look up portal users with full permission resolution (Users → PermissionUsers → PermissionAssignments → PermissionSets)
- `grafana` — Connect to Grafana and query Grafana HTTP APIs
- `mongo-sync` — Copy MongoDB collections from dev or prod to local with confirmation workflow

## Current skills

- `firebase` — Firebase user management for lookup, listing, and profile or role updates
- `mongo-sync` — Copy and dump MongoDB collections from prod/dev to local using sync-to-local.js

## Conventions

- Firebase scripts support `--prod` flag to switch from dev to production environment
- Firebase service account keys (`firebaseKey*`) are gitignored — never commit them
- Mongo scripts support `--prod` / `--local` flags to switch between dev/prod/local MongoDB URLs
- Mongo connection URLs are stored in `mongo/.env` as `MONGO_URL_DEV`, `MONGO_URL_LOCAL`, and `MONGO_URL_PROD` (gitignored — never commit it)
- Scripts are designed to work both as CLI tools and as importable Node.js modules
- Custom `.claude/commands/*.md` and `.claude/skills/*.md` files should use `{{REPO_ROOT}}` in executable paths; `setup.sh` replaces it with the actual repo path during installation
- When a new `.claude` skill or command is added or an existing one is modified and the user approves it, update both `README.md` and `CLAUDE.md` to keep repo documentation aligned
