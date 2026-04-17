# Grafana tools

Utilities for checking Grafana connectivity, exporting logs, and listing Grafana resources.

## Setup

Create `grafana/.env` (gitignored by `**/.env`) with values:

```env
GRAFANA_URL=https://grafana.feedme.farm
GRAFANA_TOKEN=<token>
```

You can also provide URL and token directly with CLI flags.

## Usage

```bash
# Default: dev + /api/health
node connect.js

# Query a specific API path
node connect.js --path /api/org

# Override URL and token explicitly
node connect.js --url https://grafana.example.com --token <TOKEN> --path /api/search

# Export logs as .log (default format)
node fetchLogs.js --from 2026-04-08T16:00:00.000Z --to 2026-04-09T15:59:59.000Z --service hr-backend --namespace apps-my --cluster production --maxRows 10000

# Export logs as .log with repr-like escaped message
node fetchLogs.js --from 2026-04-08T16:00:00.000Z --to 2026-04-09T15:59:59.000Z --service hr-backend --namespace apps-my --cluster production --repr

# Export logs as JSONL
node fetchLogs.js --from 2026-04-08T16:00:00.000Z --to 2026-04-09T15:59:59.000Z --service hr-backend --namespace apps-my --cluster production --format jsonl

# List datasources/folders/dashboards
node listResources.js
node listResources.js --query service --limit 100
node listResources.js --json
```

## CLI options

- `--prod`: Use production env vars (`GRAFANA_URL_PROD`, `GRAFANA_TOKEN_PROD`)
- `--url <grafana_url>`: Override Grafana base URL
- `--token <api_token>`: Override Grafana API token
- `--path <api_path>`: API path to request (default: `/api/health`)
- `--timeout <ms>`: Request timeout in milliseconds (default: `10000`)
- `--insecure`: Disable TLS certificate validation for HTTPS requests (dev troubleshooting only)

## `fetchLogs.js` options

- `--prod`: Optional legacy compatibility flag (single Grafana setup can ignore this)

- `--from <iso>`: Start time in ISO-8601 format
- `--to <iso>`: End time in ISO-8601 format
- `--service <name>`: Service name (default: `hr-backend`)
- `--namespace <name>`: Namespace (default: `apps-my`)
- `--cluster <name>`: Cluster (default: `production`)
- `--level <severity_number|$__all>`: Severity filter (`$__all` keeps all severities)
- `--maxRows <n>`: Row limit (default: `10000`)
- `--query <text>`: Extra query text appended to datasource query
- `--format <log|jsonl>`: Output format (default: `log`)
- `--repr`: Use escaped representation for message text in `.log` output
- `--output <path>`: Output file path

## `listResources.js` options

- `--prod`: Optional legacy compatibility flag (single Grafana setup can ignore this)
- `--limit <n>`: Max dashboards to return (default: `200`)
- `--query <text>`: Search keyword for dashboards
- `--json`: Print full JSON output
