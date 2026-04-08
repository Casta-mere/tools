---
allowed-tools: Bash(node:*), AskUserQuestion
description: Update MongoDB documents with mandatory preview and confirmation
---

## Your task

The user invoked `/mongo-update` with the following arguments: $ARGUMENTS

Help the user update documents in MongoDB using the script at `{{REPO_ROOT}}/mongo/update.js`.

### SAFETY RULES — follow these strictly

1. **NEVER skip the dry-run step.** Always run with `--dry-run` first so the user sees exactly which documents will be affected.
2. **NEVER proceed without explicit user confirmation.** After showing the preview, ask the user to confirm before executing the real update. Wait for a clear "yes" / "confirm" / "go ahead".
3. **NEVER allow an empty filter `{}`** — the script blocks it, but you should also refuse to construct one.
4. **Production updates require DOUBLE confirmation.** If `--prod` is involved, warn the user prominently and ask them to confirm twice (once after preview, once before execution).
5. **Prefer narrow filters.** If the user's filter looks too broad (e.g. matches > 50 documents), warn them and suggest adding `--limit` or a more specific filter.
6. **After the update, always verify** by re-querying the affected documents so the user can see the new state.

### Available command

```
node {{REPO_ROOT}}/mongo/update.js [--prod] --db <database> --collection <collection> --filter '<json>' --update '<json>' [--limit <n>] [--dry-run]
```

- `--dry-run` — preview matching documents without making changes
- `--limit <n>` — cap how many documents get updated
- `--prod` — target production MongoDB

### Workflow

**Step 1 — Gather info:** If `$ARGUMENTS` is missing database, collection, filter, or update operation, ask the user for them. Make sure the update uses MongoDB update operators (`$set`, `$unset`, `$push`, etc.) — reject raw replacement documents.

**Step 2 — Dry run:** Run the command with `--dry-run` to preview matching documents:
```
node {{REPO_ROOT}}/mongo/update.js --db <db> --collection <col> --filter '<filter>' --update '<update>' --dry-run
```
Show the user the matching documents and the total count.

**Step 3 — Confirm:** Present a clear summary:
- Database & collection
- Filter
- Update operation
- Number of documents that will be affected
- Whether this is dev or PROD

Then ask: **"Do you want to proceed with this update?"**

For `--prod`, add a prominent warning:
```
⚠️  PRODUCTION UPDATE — This will modify real data. Are you sure?
```

**Step 4 — Execute:** Only after explicit confirmation, run without `--dry-run`:
```
node {{REPO_ROOT}}/mongo/update.js --db <db> --collection <col> --filter '<filter>' --update '<update>'
```

**Step 5 — Verify:** Re-query the affected documents to show the user the updated state:
```
node {{REPO_ROOT}}/mongo/query.js --db <db> --collection <col> --filter '<filter>'
```

### Flags

- Add `--prod` to any command to target production MongoDB instead of dev.
- Add `--limit <n>` to cap the number of documents updated.
