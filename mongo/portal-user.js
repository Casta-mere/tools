/**
 * portal-user.js — Resolve a portal user's full permission chain.
 *
 * Chain: Users → PermissionUsers → PermissionAssignments → PermissionSets
 *
 * Usage:
 *   node portal-user.js [--prod] --email <email>
 *   node portal-user.js [--prod] --phone <phone>
 *   node portal-user.js [--prod] --userId <firebaseUid>
 *   node portal-user.js [--prod] --permissionUserId <objectId>
 *   node portal-user.js [--prod] --businessId <objectId> [--limit <n>]
 *
 * Outputs structured JSON with all linked documents, effective permissions,
 * provenance tags, and warnings for missing links.
 */

const { getDb, disconnect } = require("./index");
const { ObjectId } = require("mongodb");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ruleKey(subject, actions) {
  return `${subject}::${[...actions].sort().join(",")}`;
}

/**
 * Merge permissions from multiple permission sets.
 * Mirrors mergePermissionSet from hrm-service-packages.
 */
function mergePermissionSets(permissionSets) {
  const grantMap = new Map();
  const denialMap = new Map();

  for (const ps of permissionSets) {
    for (const perm of ps.permissions || []) {
      const map = perm.inverted ? denialMap : grantMap;
      const key = ruleKey(perm.subject, perm.actions);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          ...perm,
          _setNames: [ps.name],
          _setId: ps._id,
        });
        continue;
      }

      existing._setNames.push(ps.name);

      // Union $in conditions from multiple sets
      if (existing.conditions && perm.conditions) {
        const a =
          typeof existing.conditions === "string"
            ? JSON.parse(existing.conditions)
            : existing.conditions;
        const b =
          typeof perm.conditions === "string"
            ? JSON.parse(perm.conditions)
            : perm.conditions;

        for (const field in b) {
          if (a[field]?.$in && b[field]?.$in) {
            a[field].$in = [...new Set([...a[field].$in, ...b[field].$in])];
          } else if (!a[field]) {
            a[field] = b[field];
          }
        }
        existing.conditions = JSON.stringify(a);
      }
    }
  }

  return [...grantMap.values(), ...denialMap.values()];
}

/**
 * Compute effective permissions from base (permission sets) and custom permissions.
 * Custom non-inverted rules replace matching base rules by subject+actions key.
 */
function computeEffectivePermissions(baseMerged, customPermissions) {
  const customPositiveKeys = new Set(
    customPermissions
      .filter((p) => !p.inverted)
      .map((p) => ruleKey(p.subject, p.actions))
  );

  const filteredBase = baseMerged.filter(
    (p) => !customPositiveKeys.has(ruleKey(p.subject, p.actions))
  );

  // Tag provenance
  const taggedBase = filteredBase.map((p) => {
    const { _setNames, _setId, ...rest } = p;
    return {
      ...rest,
      _source: `permissionSet:${(_setNames || []).join(",")}`,
    };
  });

  const taggedCustom = customPermissions.map((p) => ({
    ...p,
    _source: "custom",
  }));

  return [...taggedBase, ...taggedCustom];
}

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a portal user's full permission chain.
 *
 * @param {object} opts
 * @param {string} [opts.email]
 * @param {string} [opts.phone]
 * @param {string} [opts.userId]           Firebase UID → starts from Users
 * @param {string} [opts.permissionUserId] PermissionUsers._id → skips Users
 * @param {string} [opts.businessId]       Returns multiple users
 * @param {number} [opts.limit]            Limit for businessId lookups (default 50)
 * @returns {Promise<object>}
 */
async function resolvePortalUser(opts = {}) {
  const db = await getDb("companyDB");
  const usersCol = db.collection("Users");
  const permUsersCol = db.collection("PermissionUsers");
  const assignmentsCol = db.collection("PermissionAssignments");
  const permSetsCol = db.collection("PermissionSets");

  const warnings = [];

  // -----------------------------------------------------------------------
  // Step 1: Find PermissionUsers entry point(s)
  // -----------------------------------------------------------------------
  let permissionUsers = [];
  let userDoc = null;

  if (opts.email) {
    // Try Users collection first
    userDoc = await usersCol.findOne({ email: opts.email });
    if (userDoc) {
      permissionUsers = await permUsersCol
        .find({ userId: userDoc._id })
        .toArray();
      if (permissionUsers.length === 0) {
        warnings.push(
          `User found in Users (${userDoc._id}) but no PermissionUsers entry`
        );
        // Fallback: try PermissionUsers.email directly
        permissionUsers = await permUsersCol
          .find({ email: opts.email })
          .toArray();
        if (permissionUsers.length > 0) {
          warnings.push(
            "Found PermissionUsers by email directly (userId link mismatch)"
          );
        }
      }
    } else {
      // No Users doc — try PermissionUsers.email directly
      permissionUsers = await permUsersCol
        .find({ email: opts.email })
        .toArray();
      if (permissionUsers.length > 0) {
        warnings.push(
          "No Users document found; PermissionUsers found by email directly"
        );
      }
    }
  } else if (opts.phone) {
    userDoc = await usersCol.findOne({ phoneNumber: opts.phone });
    if (userDoc) {
      permissionUsers = await permUsersCol
        .find({ userId: userDoc._id })
        .toArray();
      if (permissionUsers.length === 0) {
        warnings.push(
          `User found in Users (${userDoc._id}) but no PermissionUsers entry`
        );
      }
    } else {
      // Try PermissionUsers.phoneNo
      permissionUsers = await permUsersCol
        .find({ phoneNo: opts.phone })
        .toArray();
      if (permissionUsers.length > 0) {
        warnings.push(
          "No Users document found; PermissionUsers found by phoneNo directly"
        );
      }
    }
  } else if (opts.userId) {
    userDoc = await usersCol.findOne({ _id: opts.userId });
    if (!userDoc) {
      warnings.push(`No Users document with _id="${opts.userId}"`);
    }
    permissionUsers = await permUsersCol
      .find({ userId: opts.userId })
      .toArray();
  } else if (opts.permissionUserId) {
    let filter;
    try {
      filter = { _id: new ObjectId(opts.permissionUserId) };
    } catch {
      filter = { _id: opts.permissionUserId };
    }
    const pu = await permUsersCol.findOne(filter);
    if (pu) {
      permissionUsers = [pu];
      // Also fetch the linked Users doc for display
      userDoc = await usersCol.findOne({ _id: pu.userId });
      if (!userDoc) {
        warnings.push(
          `PermissionUsers.userId="${pu.userId}" has no matching Users document`
        );
      }
    }
  } else if (opts.businessId) {
    const limit = opts.limit || 50;
    permissionUsers = await permUsersCol
      .find({ businessId: opts.businessId })
      .limit(limit)
      .toArray();
  } else {
    return { error: "No lookup key provided", warnings };
  }

  if (permissionUsers.length === 0) {
    return {
      user: userDoc,
      permissionUsers: [],
      results: [],
      warnings: [...warnings, "No PermissionUsers documents found"],
    };
  }

  // -----------------------------------------------------------------------
  // Step 2: For each PermissionUser, resolve assignments and permission sets
  // -----------------------------------------------------------------------
  const results = [];

  // Batch-fetch all assignments for these permission users
  const puIds = permissionUsers.map((pu) => String(pu._id));
  const assignments = await assignmentsCol
    .find({ userId: { $in: puIds } })
    .toArray();
  const assignmentByUserId = new Map(assignments.map((a) => [a.userId, a]));

  // Collect all referenced permission set IDs across all assignments
  const allSetIds = new Set();
  for (const a of assignments) {
    for (const id of a.permissionSetIds || []) {
      allSetIds.add(id);
    }
  }

  // Batch-fetch all permission sets (first level)
  let allSets = new Map();
  if (allSetIds.size > 0) {
    const setDocs = await permSetsCol
      .find({
        _id: {
          $in: [...allSetIds].map((id) => {
            try {
              return new ObjectId(id);
            } catch {
              return id;
            }
          }),
        },
      })
      .toArray();
    for (const s of setDocs) {
      allSets.set(String(s._id), s);
      // Collect nested set IDs for recursive fetch
      for (const nested of s.permissionSetIds || []) {
        if (!allSets.has(nested)) allSetIds.add(nested);
      }
    }

    // Recursively fetch any nested sets not yet loaded
    let pendingIds = [...allSetIds].filter((id) => !allSets.has(id));
    const visited = new Set([...allSets.keys()]);
    while (pendingIds.length > 0) {
      const moreSets = await permSetsCol
        .find({
          _id: {
            $in: pendingIds.map((id) => {
              try {
                return new ObjectId(id);
              } catch {
                return id;
              }
            }),
          },
        })
        .toArray();
      const nextPending = [];
      for (const s of moreSets) {
        const sid = String(s._id);
        allSets.set(sid, s);
        visited.add(sid);
        for (const nested of s.permissionSetIds || []) {
          if (!visited.has(nested)) {
            nextPending.push(nested);
            visited.add(nested);
          }
        }
      }
      pendingIds = nextPending;
    }
  }

  // For business-level lookups, batch-fetch User docs for display names
  let usersByUid = new Map();
  if (opts.businessId && permissionUsers.length > 1) {
    const uids = [
      ...new Set(permissionUsers.map((pu) => pu.userId).filter(Boolean)),
    ];
    if (uids.length > 0) {
      const userDocs = await usersCol.find({ _id: { $in: uids } }).toArray();
      for (const u of userDocs) {
        usersByUid.set(u._id, u);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Step 3: Build result for each PermissionUser
  // -----------------------------------------------------------------------
  for (const pu of permissionUsers) {
    const puId = String(pu._id);
    const assignment = assignmentByUserId.get(puId) || null;

    // Resolve linked User doc
    let linkedUser = userDoc;
    if (opts.businessId) {
      linkedUser = usersByUid.get(pu.userId) || null;
    } else if (!linkedUser && pu.userId) {
      linkedUser = await usersCol.findOne({ _id: pu.userId });
    }

    let effectivePermissions = [];
    let permissionSetDocs = [];
    let source = "none";

    if (assignment) {
      // Modern path: PermissionAssignment exists
      // Recursively collect permission sets
      const collectedSets = collectPermissionSetsFromMap(
        assignment.permissionSetIds || [],
        allSets
      );
      permissionSetDocs = collectedSets.sets;
      const missingSetIds = collectedSets.missing;
      if (missingSetIds.length > 0) {
        warnings.push(
          `PermissionUser ${puId}: missing PermissionSets: ${missingSetIds.join(", ")}`
        );
      }

      const baseMerged = mergePermissionSets(permissionSetDocs);
      const customPerms = assignment.customPermissions || [];
      effectivePermissions = computeEffectivePermissions(
        baseMerged,
        customPerms
      );
      source =
        permissionSetDocs.length > 0 && customPerms.length > 0
          ? "assignment+sets"
          : permissionSetDocs.length > 0
            ? "sets"
            : customPerms.length > 0
              ? "assignment"
              : "assignment(empty)";
    } else {
      // Legacy fallback
      if (pu.permissions && pu.permissions.length > 0) {
        effectivePermissions = pu.permissions.map((p) => ({
          ...p,
          _source: "legacy",
        }));
        source = "legacy(PermissionUsers.permissions)";
      } else {
        source = "none";
        warnings.push(
          `PermissionUser ${puId}: no assignment and no legacy permissions`
        );
      }
    }

    results.push({
      user: linkedUser
        ? {
            _id: linkedUser._id,
            displayName: linkedUser.displayName,
            email: linkedUser.email,
            phoneNumber: linkedUser.phoneNumber,
          }
        : null,
      permissionUser: {
        _id: pu._id,
        userId: pu.userId,
        businessId: pu.businessId,
        email: pu.email,
        phoneNo: pu.phoneNo,
        legacyPermissionCount: (pu.permissions || []).length,
      },
      permissionAssignment: assignment
        ? {
            _id: assignment._id,
            userId: assignment.userId,
            businessId: assignment.businessId,
            customPermissionCount: (assignment.customPermissions || []).length,
            permissionSetIds: assignment.permissionSetIds || [],
          }
        : null,
      permissionSets: permissionSetDocs.map((s) => ({
        _id: s._id,
        name: s.name,
        permissionCount: (s.permissions || []).length,
        permissionSetIds: s.permissionSetIds || [],
      })),
      effectivePermissions,
      source,
    });
  }

  return {
    user: userDoc
      ? {
          _id: userDoc._id,
          displayName: userDoc.displayName,
          email: userDoc.email,
          phoneNumber: userDoc.phoneNumber,
        }
      : null,
    resultCount: results.length,
    results,
    warnings,
  };
}

/**
 * Recursively collect permission sets from pre-fetched map.
 * Cycle-safe via visited set.
 */
function collectPermissionSetsFromMap(
  setIds,
  allSetsMap,
  visited = new Set()
) {
  const sets = [];
  const missing = [];

  for (const id of setIds) {
    if (visited.has(id)) continue;
    visited.add(id);

    const set = allSetsMap.get(id);
    if (!set) {
      missing.push(id);
      continue;
    }
    sets.push(set);

    if (set.permissionSetIds && set.permissionSetIds.length > 0) {
      const nested = collectPermissionSetsFromMap(
        set.permissionSetIds,
        allSetsMap,
        visited
      );
      sets.push(...nested.sets);
      missing.push(...nested.missing);
    }
  }

  return { sets, missing };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function printUsage() {
  console.log(
    "Usage: node portal-user.js [--prod] --email <email> | --phone <phone> | --userId <uid> | --permissionUserId <id> | --businessId <id> [--limit <n>]"
  );
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => a !== "--prod");

  const email = getArg(args, "--email");
  const phone = getArg(args, "--phone");
  const userId = getArg(args, "--userId");
  const permissionUserId = getArg(args, "--permissionUserId");
  const businessId = getArg(args, "--businessId");
  const limit = getArg(args, "--limit");

  if (!email && !phone && !userId && !permissionUserId && !businessId) {
    printUsage();
    process.exit(1);
  }

  const opts = {};
  if (email) opts.email = email;
  if (phone) opts.phone = phone;
  if (userId) opts.userId = userId;
  if (permissionUserId) opts.permissionUserId = permissionUserId;
  if (businessId) opts.businessId = businessId;
  if (limit) opts.limit = parseInt(limit, 10);

  resolvePortalUser(opts)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error("Resolve failed:", err.message);
      process.exit(1);
    })
    .finally(() => disconnect().then(() => process.exit(0)));
}

module.exports = { resolvePortalUser };
