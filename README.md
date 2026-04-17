# Tools

A collection of small utility scripts.

## Firebase (`firebase/`)

Firebase Admin SDK utilities for user management:

- **phoneNumber.js** — Look up users by phone number or list all users
- **updateUser.js** — Update user display name, email, or role

All scripts support `--prod` flag to target the production Firebase project. See [firebase/README.md](firebase/README.md) for detailed usage.

## Mongo (`mongo/`)

MongoDB utilities for querying and updating data:

- **index.js** — List available databases
- **query.js** — Run find queries against a collection
- **update.js** — Preview and apply MongoDB updates safely

## Portal (`portal/`)

HRM version lookup utilities:

- **hrmVersion.js** — Fetch HRM frontend and backend versions for dev or prod

## Grafana (`grafana/`)

Grafana connection utilities:

- **connect.js** — Test Grafana connectivity and query Grafana HTTP APIs

## Custom commands (`.claude/commands/`)

- **hrm-version** — Look up HRM frontend and backend versions for both dev and prod
- **mongo** — Query MongoDB databases and collections
- **mongo-update** — Update MongoDB documents with preview and confirmation
- **portal-user** — Look up portal users by email, userId, or businessId
- **grafana** — Connect to Grafana and query Grafana HTTP APIs

## Custom skills (`.claude/skills/`)

- **firebase** — Firebase user management helpers for user lookup and updates

## Repository conventions

- Custom `.claude` skills and commands should be reflected in both `README.md` and `CLAUDE.md` once the user confirms the change is wanted.

## License

MIT
