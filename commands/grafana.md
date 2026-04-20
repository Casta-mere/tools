---
allowed-tools: Bash(node:*)
description: Connect to Grafana and query Grafana HTTP APIs
---

## Your task

The user invoked `/grafana` with the following arguments: $ARGUMENTS

Use `{{REPO_ROOT}}/grafana/connect.js` to test connectivity and query Grafana.

### Execute directory

Run commands from `{{REPO_ROOT}}/grafana`.

### Command

```bash
node {{REPO_ROOT}}/grafana/connect.js [--prod] [--path /api/health|/api/org|/api/search]
```

### Behavior

1. If `$ARGUMENTS` is empty, run `node {{REPO_ROOT}}/grafana/connect.js`.
2. If `$ARGUMENTS` includes `prod` or `--prod`, add `--prod`.
3. If `$ARGUMENTS` mentions a Grafana endpoint path (for example `/api/org`), pass it using `--path`.
4. Present the response status and key body fields clearly.
5. If status is `401` or `403`, explain that token permissions or token value may be invalid.

### Notes

- Environment variables are loaded from `{{REPO_ROOT}}/grafana/.env`.
- Preferred env vars: `GRAFANA_URL`, `GRAFANA_TOKEN`
- Legacy fallback env vars: `GRAFANA_URL_DEV`, `GRAFANA_URL_PROD`, `GRAFANA_TOKEN_DEV`, `GRAFANA_TOKEN_PROD`
