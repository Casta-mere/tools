---
name: dedup-portal-user
description: Fix duplicate companyDB.Users docs caused by Firebase phone re-linking — Option A workflow (clear stale phoneNumber, migrate PermissionUsers to new UID)
user_invocable: true
---

# Dedup Portal User (Option A Fix)

When a phone number is re-linked from one Firebase UID to another (e.g. user signs in via Google and links their phone), a duplicate `companyDB.Users` document can exist. The old UID retains the stale `phoneNumber`; the new UID has no `PermissionUsers`, so the user loses all business permissions.

**Option A:** Keep both `Users` docs, but:
1. Clear `phoneNumber` from the old doc (push to `prevPhoneNumbers`)
2. Update `PermissionUsers.userId` → new UID so the new account inherits permissions

## When to invoke

Invoke this skill when `/portal-user` reveals a duplicate Users situation: same phone or email appears in more than one `Users` document.

## Step 1 — Detect duplicates

After a `/portal-user` lookup by phone or email, check for duplicate Users docs:

```bash
node /Users/wangxugang/Dev/tools/mongo/query.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"phoneNumber": "<phone>"}'
```

If more than one document is returned, duplicates exist. Collect all `_id` values (Firebase UIDs).

## Step 2 — Identify the current Firebase owner

Query Firebase Auth to find which UID currently owns the phone:

```bash
node /Users/wangxugang/Dev/tools/firebase/phoneNumber.js [--prod] <phone>
```

The UID returned by Firebase is the **current owner** (new UID). Any other `_id` values from Step 1 are **old/stale UIDs**.

## Step 3 — Back up all affected documents

Before making any changes, back up all affected docs:

```bash
node /Users/wangxugang/Dev/tools/mongo/backup-user.js [--prod] \
  --uids "<oldUid>,<newUid>" \
  --out /Users/wangxugang/Dev/tools/mongo/backup-<phone>.json
```

Confirm the backup file was created and contains the expected documents.

## Step 4 — Migrate PermissionUsers to new UID

Check if `PermissionUsers` records reference the old UID:

```bash
node /Users/wangxugang/Dev/tools/mongo/query.js [--prod] \
  --db companyDB --collection PermissionUsers \
  --filter '{"userId": "<oldUid>"}'
```

If records exist, update them (use the `/mongo-update` skill or run directly):

**Dry run first:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection PermissionUsers \
  --filter '{"userId": "<oldUid>"}' \
  --update '{"$set": {"userId": "<newUid>"}}' \
  --dry-run
```

**After user confirms, execute:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection PermissionUsers \
  --filter '{"userId": "<oldUid>"}' \
  --update '{"$set": {"userId": "<newUid>"}}'
```

> Note: `PermissionAssignments.userId` references the `PermissionUsers._id` (ObjectId), NOT the Firebase UID directly — so those records do NOT need updating.

## Step 5 — Migrate profile fields to new Users doc

Before clearing the old doc, compare its profile fields against the new doc. For any field that is populated in the old doc but null/missing/zero in the new doc, migrate the value across with `$set`.

Fields to check: `displayName`, `email`, `birthday`, `birthdayCount`, `gender`, `photoURL`, `addresses`, `role`, and any other non-null user-facing fields.

**Dry run:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"_id": "<newUid>"}' \
  --update '{"$set": {"displayName": "...", "email": "...", ...}}' \
  --dry-run
```

**After user confirms, execute:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"_id": "<newUid>"}' \
  --update '{"$set": {"displayName": "...", "email": "...", ...}}'
```

Skip this step if the new doc already has all fields populated, or if the old doc has nothing to offer.

## Step 6 — Clear phoneNumber from old Users doc

**Dry run:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"_id": "<oldUid>"}' \
  --update '{"$set": {"phoneNumber": null}, "$push": {"prevPhoneNumbers": "<phone>"}}' \
  --dry-run
```

**After user confirms, execute:**
```bash
node /Users/wangxugang/Dev/tools/mongo/update.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"_id": "<oldUid>"}' \
  --update '{"$set": {"phoneNumber": null}, "$push": {"prevPhoneNumbers": "<phone>"}}'
```

## Step 7 — Verify

Re-run the portal user lookup to confirm the new UID now has permissions and the old doc has `phoneNumber: null`:

```bash
node /Users/wangxugang/Dev/tools/mongo/portal-user.js [--prod] --phone <phone>
```

Also verify the old doc:
```bash
node /Users/wangxugang/Dev/tools/mongo/query.js [--prod] \
  --db companyDB --collection Users \
  --filter '{"_id": "<oldUid>"}'
```

## What is NOT changed (out of scope)

- The old `Users` document is **kept** — only `phoneNumber` is cleared
- `PermissionAssignments` are **not touched** — they reference `PermissionUsers._id` (ObjectId), which stays the same
- The Firebase UID on the old `Users` doc stays as-is — this is a historical record

## Safety checklist

- [ ] Backup created before any changes
- [ ] Dry run reviewed for all updates
- [ ] User explicitly confirmed production changes
- [ ] Profile fields from old doc migrated to new doc where new is null/missing
- [ ] Verified new UID has permissions after fix
- [ ] Verified old doc has `phoneNumber: null`
