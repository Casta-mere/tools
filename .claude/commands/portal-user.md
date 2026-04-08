---
allowed-tools: Bash(node:*)
description: Look up portal users in MongoDB (companyDB/PermissionUsers) by email, userId, or businessId
---

## Your task

Look up a portal user in MongoDB. The user is identified by: $ARGUMENTS

Portal users are stored in `companyDB/PermissionUsers` (note: capital P).

### Document shape

```json
{
  "_id": "<ObjectId>",
  "userId": "<Firebase UID>",
  "businessId": "<businessId>",
  "email": "<email>",
  "phoneNo": "<phone or null>",
  "permissions": [
    {
      "label": "<role label>",
      "subject": "<subject>",
      "actions": ["manage" | "read" | ...]
    }
  ]
}
```

### Lookup strategy

- If `$ARGUMENTS` contains `@`, treat it as an email → filter `{"email": "<value>"}`.
- If `$ARGUMENTS` is a 24-char hex string (MongoDB ObjectId), filter `{"businessId": "<value>"}` and use `--limit 100`.
- If `$ARGUMENTS` looks like a Firebase UID (20–28 alphanumeric chars, mixed case), filter `{"userId": "<value>"}`.
- If `$ARGUMENTS` mentions "business" followed by an ID, extract the ID and filter by `businessId`.
- If `$ARGUMENTS` is ambiguous or empty, ask the user for an email, userId, or businessId.
- Add `--prod` if the user specifies production.

### Command to run

```
node /Users/wangxugang/Dev/tools/mongo/query.js --db companyDB --collection PermissionUsers --filter '<json>'
```

### After fetching

**For multiple results (businessId lookup):** render a summary table with one row per user:

```
**N portal users for business `<businessId>`:**

| # | Email | Phone | userId | Permissions | Notable Permissions |
|---|---|---|---|---|---|
| 1 | xugang@feedme.cc | — | `Bmc8vsNLGqZUIFRWe5wJLVdcyk73` | 2 | Restaurant Owner |
| 2 | — | +60111111111 | `fWiCnTaNj5dDbviXcirae1MVrro1` | 6 | Owner, Team/Employee/Audit, Stock |
```

- Email: use `—` if null/empty
- Phone: use `—` if null/empty
- userId: wrap in backticks
- Permissions: total count of entries in the `permissions` array
- Notable Permissions: summarize the permission labels concisely (e.g. "Owner, Team/Employee/Audit, Reports"); skip unlabeled/technical subjects

**For a single result (email or userId lookup):** render a two-section layout:

```
**Portal User: <email or userId>**

| Field | Value |
|---|---|
| `_id` | `<value>` |
| `userId` (Firebase UID) | `<value>` |
| `businessId` | `<value>` |
| `phoneNo` | <value or null> |

**Permissions:**

| Label | Subject | Actions |
|---|---|---|
| Restaurant Owner | `business::restaurant` | `manage` |
| _(unlabeled)_ | `business::report::reports::undefined` | `manage`, `read`, `create` |
```

- Use `_(unlabeled)_` when the label field is empty or missing.

If no document is found, say so clearly and suggest checking the country-specific DBs (e.g. `SG_companyDB`, `ID_companyDB`) with the same collection name.
