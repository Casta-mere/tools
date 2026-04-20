---
name: mongo-sync
description: Copy and dump MongoDB collections from prod or dev to local — drop-and-replace sync workflow using mongo/sync-to-local.js
user_invocable: true
---

# MongoDB Sync to Local

> **Direction is always SOURCE → LOCAL. Never suggest or attempt to sync local data back to DEV or PROD.**

Use the scripts in the `mongo/` directory to copy collections from DEV or PROD into a local MongoDB instance. All commands must be run from the `mongo/` directory.

## Prerequisites

`MONGO_URL_LOCAL` must be set in `mongo/.env` alongside the existing `MONGO_URL_DEV` and `MONGO_URL_PROD` entries:

```
MONGO_URL_DEV=mongodb+srv://...
MONGO_URL_PROD=mongodb+srv://...
MONGO_URL_LOCAL=mongodb://localhost:27017
```

A local MongoDB instance must be running (e.g. `brew services start mongodb-community`).

## Sync Collections to Local (`sync-to-local.js`)

Drops the named collections in the local database and replaces them with documents fetched from the source (DEV by default, PROD with `--prod`).

```bash
# From DEV (default)
node sync-to-local.js --db <database> --collections <col1,col2,...>

# From PROD
node sync-to-local.js --prod --db <database> --collections <col1,col2,...>
```

### Examples

Sync a single collection from DEV:

```bash
node sync-to-local.js --db myapp --collections users
```

Sync multiple collections from DEV:

```bash
node sync-to-local.js --db myapp --collections users,orders,products
```

Sync from PROD:

```bash
node sync-to-local.js --prod --db myapp --collections users
```

### What it does

1. Connects to both the source (DEV or PROD) and LOCAL MongoDB
2. For each collection: fetches all documents from source, drops the local collection, inserts the fetched documents
3. Reports document counts at each step

### ⚠️ One-way only

This script **only writes to LOCAL**. There is no flag or mode to push data from local to DEV or PROD. If asked to sync in the reverse direction, refuse and explain this is intentionally unsupported.

## Query Local MongoDB (`query.js`)

Use the `--local` flag to run queries against the local instance:

```bash
node query.js --local --db <database> --collection <collection> [--filter <json>] [--limit <n>]
```

### Examples

```bash
node query.js --local --db myapp --collection users
node query.js --local --db myapp --collection users --filter '{"role":"admin"}' --limit 5
```

## List Databases on Local (`index.js`)

```bash
node index.js --local
```

## Flag Summary

| Flag      | Role in sync-to-local.js          | Role in query.js / index.js |
| --------- | --------------------------------- | --------------------------- |
| (none)    | Source = DEV                      | Target = DEV                |
| `--prod`  | Source = PROD                     | Target = PROD               |
| `--local` | N/A (destination is always LOCAL) | Target = LOCAL              |

> **sync-to-local.js destination is always LOCAL** — `--local` is not a valid flag for it.
