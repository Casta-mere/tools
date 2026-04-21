---
allowed-tools: Bash(node:*)
description: Look up portal users with full permission resolution (Users → PermissionUsers → PermissionAssignments → PermissionSets)
---

## Your task

Look up a portal user and resolve their full permission chain. The user is identified by: $ARGUMENTS

The resolver follows four MongoDB collections in `companyDB`:
1. **Users** — base user profile (email, phone, displayName)
2. **PermissionUsers** — links user to a business, holds legacy permissions
3. **PermissionAssignments** — modern permission source: `customPermissions` + `permissionSetIds`
4. **PermissionSets** — reusable permission templates (can be recursive)

### Lookup strategy

- If `$ARGUMENTS` contains `@`, use `--email "<value>"`.
- If `$ARGUMENTS` starts with `+` or is pure digits, use `--phone "<value>"`.
- If `$ARGUMENTS` looks like a Firebase UID (20–28 alphanumeric chars, mixed case), use `--userId "<value>"`.
- If `$ARGUMENTS` is a 24-char hex string, it's **ambiguous** (could be businessId or PermissionUsers._id):
  - Default: treat as `--businessId "<value>"` (most common).
  - If prefixed with `pu:` (e.g. `pu:6969979a3eb1b2cd81087326`), strip the prefix and use `--permissionUserId "<value>"`.
- If `$ARGUMENTS` mentions "business" followed by an ID, extract the ID and use `--businessId`.
- If `$ARGUMENTS` is ambiguous or empty, ask the user for an email, userId, or businessId.
- Add `--prod` if the user specifies production.

### Command to run

```
node {{REPO_ROOT}}/mongo/portal-user.js [--prod] --email <email>
node {{REPO_ROOT}}/mongo/portal-user.js [--prod] --phone <phone>
node {{REPO_ROOT}}/mongo/portal-user.js [--prod] --userId <firebaseUid>
node {{REPO_ROOT}}/mongo/portal-user.js [--prod] --permissionUserId <objectId>
node {{REPO_ROOT}}/mongo/portal-user.js [--prod] --businessId <objectId> [--limit <n>]
```

### After fetching

The resolver returns JSON with `results[]`, each containing `user`, `permissionUser`, `permissionAssignment`, `permissionSets`, `effectivePermissions`, `source`, and top-level `warnings[]`.

**For a single result (email, phone, or userId lookup):** render a multi-section layout:

```
**Portal User: <email or displayName>**

**Linked Documents:**

| Collection | _id | Key Fields |
|---|---|---|
| Users | `<_id>` | displayName: "...", email: "...", phone: ... |
| PermissionUsers | `<_id>` | businessId: `<id>`, legacy permissions: N |
| PermissionAssignments | `<_id>` | custom permissions: N, permission sets: N |

**Permission Sets:**

| Name | _id | Permission Count | Nested Sets |
|---|---|---|---|
| Admin Role | `<_id>` | 12 | — |
| Report Access | `<_id>` | 3 | 1 child set |

**Effective Permissions (source: <source>):**

| Label | Subject | Actions | Source |
|---|---|---|---|
| Restaurant Owner | `business::restaurant` | `manage` | permissionSet:Admin Role |
| _(unlabeled)_ | `business::report::reports::abc123` | `read`, `create` | custom |
| _(denied)_ | `business::report::reports::abc123` | `create` | custom (inverted) |
```

- Use `_(unlabeled)_` when the label field is empty or missing.
- Use `_(denied)_` for inverted (denial) rules and note "(inverted)" in the Source column.
- The `source` field at the top indicates the overall permission origin: `assignment+sets`, `sets`, `assignment`, `legacy(PermissionUsers.permissions)`, or `none`.

**For multiple results (businessId lookup):** render a summary table:

```
**N portal users for business `<businessId>`:**

| # | Email | Phone | Display Name | userId | Source | Effective Perms | Sets |
|---|---|---|---|---|---|---|---|
| 1 | xugang@feedme.cc | — | XuGang Wang | `Bmc8vs...k73` | assignment+sets | 6 | Test report |
| 2 | — | +60111111111 | John | `fWiCn...ro1` | legacy | 4 | — |
```

- Email/Phone: use `—` if null/empty
- userId: wrap in backticks, truncate to first 6 + last 3 chars
- Source: from the `source` field
- Effective Perms: count of `effectivePermissions`
- Sets: comma-separated permission set names, or `—` if none

**Warnings:** If the resolver returns any `warnings`, display them prominently:
```
⚠️ Warnings:
- No Users document found; PermissionUsers found by email directly
```

If no results are found, say so clearly and suggest:
1. Checking country-specific DBs (e.g. `SG_companyDB`, `ID_companyDB`) by running with `--db SG_companyDB` etc.
2. Trying a different identifier type.

---

### Duplicate Users detection (phone and email lookups only)

After displaying the result for a **phone** or **email** lookup, run an extra check for duplicate `Users` documents:

```bash
# For phone lookup:
node {{REPO_ROOT}}/mongo/query.js [--prod] --db companyDB --collection Users --filter '{"phoneNumber": "<phone>"}'

# For email lookup:
node {{REPO_ROOT}}/mongo/query.js [--prod] --db companyDB --collection Users --filter '{"email": "<email>"}'
```

If more than one document is returned:

1. Display a prominent warning:
   ```
   ⚠️  Duplicate Users detected for <phone/email>:
   - <uid1> (displayName: "...", email: "...")  ← current Firebase owner (to be verified)
   - <uid2> (displayName: "...", email: "...")  ← stale doc
   ```

2. Ask the user: **"Do you want to fix this with the Option A dedup workflow?"**

3. If yes, invoke the `dedup-portal-user` skill to walk through:
   - Identify current Firebase owner (Step 2)
   - Back up affected docs (Step 3)
   - Migrate `PermissionUsers.userId` to new UID (Step 4)
   - Clear `phoneNumber` from old doc (Step 5)
   - Verify the fix (Step 6)
