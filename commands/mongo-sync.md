---
allowed-tools: Bash(node:*), AskUserQuestion
description: Copy MongoDB collections from dev or prod to local (drop & replace sync). Direction is always SOURCE → LOCAL only.
---

## Context

- Available DEV databases: !`cd {{REPO_ROOT}}/mongo && node index.js 2>&1`

## Your task

The user invoked `/mongo-sync` with the following arguments: $ARGUMENTS

Help the user sync MongoDB collections from DEV (or PROD) into their local MongoDB using the scripts in `{{REPO_ROOT}}/mongo/`.

### SAFETY RULES — follow these strictly

1. **Direction is always SOURCE → LOCAL. Never sync local data to DEV or PROD.** If the user asks to push local data to dev or prod, refuse immediately and explain it is not supported.
2. **Always confirm before syncing from PROD.** If the source is `--prod`, warn the user prominently and require explicit confirmation before running.
3. **Remind the user that sync is destructive.** Each collection is dropped in LOCAL before being replaced. Make sure the user understands this.
4. **Never guess collection names.** If the user hasn't specified collections, list available collections for the target database first, then ask which ones to sync.

### Tools available

**List databases on DEV** (already shown above in Context):

```
node {{REPO_ROOT}}/mongo/index.js
```

**List databases on PROD:**

```
node {{REPO_ROOT}}/mongo/index.js --prod
```

**Sync collections from DEV to local (default):**

```
node {{REPO_ROOT}}/mongo/sync-to-local.js --db <database> --collections <col1,col2,...>
```

**Sync collections from PROD to local:**

```
node {{REPO_ROOT}}/mongo/sync-to-local.js --prod --db <database> --collections <col1,col2,...>
```

**Query local to verify after sync:**

```
node {{REPO_ROOT}}/mongo/query.js --local --db <database> --collection <collection> [--filter '<json>'] [--limit <n>]
```

### Workflow

**Step 1 — Gather info:** If `$ARGUMENTS` is missing a database or collection names, ask the user. Use the Context above to suggest available databases.

**Step 2 — Confirm (especially for PROD source):** Present a clear summary before running:

- Source environment (DEV or PROD)
- Target: LOCAL
- Database and collections to sync
- Reminder that existing local collections will be **dropped and replaced**

For PROD as source, add a prominent warning:

```
⚠️  SYNCING FROM PRODUCTION — This will overwrite your local data with prod data. Are you sure?
```

**Step 3 — Sync:** Run the sync script:

```
node {{REPO_ROOT}}/mongo/sync-to-local.js --db <db> --collections <col1,col2,...>
```

**Step 4 — Verify:** After sync completes, query one of the synced collections locally to confirm the data looks correct:

```
node {{REPO_ROOT}}/mongo/query.js --local --db <db> --collection <col> --limit 3
```

Show the user the document count and a sample so they can confirm the sync succeeded.
