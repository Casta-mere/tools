# Tools

A collection of small utility scripts.

## Setup

Run `./setup.sh` to install Claude commands, skills, and npm dependencies.

Then configure credentials for each tool:

### `grafana/`
Copy `.env.template` to `.env` and fill in:
| Variable | Description |
|----------|-------------|
| `GRAFANA_URL_DEV` | Dev Grafana base URL |
| `GRAFANA_URL_PROD` | Prod Grafana base URL |
| `GRAFANA_TOKEN_DEV` | Dev Grafana API token |
| `GRAFANA_TOKEN_PROD` | Prod Grafana API token |

### `mongo/`
Copy `.env.template` to `.env` and fill in:
| Variable | Description |
|----------|-------------|
| `MONGO_URL_DEV` | Dev MongoDB connection string |
| `MONGO_URL_PROD` | Prod MongoDB connection string |

### `firebase/`
Add service account JSON files to `firebase/`:
- `firebaseKey-dev.json` — dev Firebase service account
- `firebaseKey-prod.json` — prod Firebase service account

### `hrm/`
Requires GitHub CLI installed and authenticated:
```sh
brew install gh && gh auth login
```

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

## HRM (`hrm/`)

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
