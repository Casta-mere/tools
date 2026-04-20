---
allowed-tools: Bash(node:*)
description: Query MongoDB — list databases/collections or fetch documents
---

## Context

- Available databases: !`cd {{REPO_ROOT}}/mongo && node index.js 2>&1`

## Your task

The user invoked `/mongo` with the following arguments: $ARGUMENTS

Based on the arguments (or absence of them), help the user query MongoDB using the scripts in `{{REPO_ROOT}}/mongo/`.

### Tools available

**List databases** (already shown above in Context):
```
node {{REPO_ROOT}}/mongo/index.js [--prod]
```

**Query a collection:**
```
node {{REPO_ROOT}}/mongo/query.js [--prod] --db <database> --collection <collection> [--filter '<json>'] [--limit <n>]
```

### How to respond

1. If `$ARGUMENTS` is empty or vague, ask the user which database and collection they want to query, and what filter (if any).
2. If the user has specified a database and/or collection in `$ARGUMENTS`, construct and run the appropriate `node query.js` command.
3. After fetching data, summarize the results clearly. If the output is large, highlight key fields or patterns.
4. Offer to refine the query (different filter, higher limit, different collection) if helpful.

### Flags

- Add `--prod` to any command to target the production MongoDB instead of dev.
- Default limit is 20 documents. Use `--limit` to override.
