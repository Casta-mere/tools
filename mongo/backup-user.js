/**
 * backup-user.js — Backup Users, PermissionUsers, PermissionAssignments for given UIDs.
 * Usage: node backup-user.js [--prod] --uids <uid1,uid2,...> --out <file.json>
 */
const { getDb, disconnect } = require("./index");
const fs = require("fs");

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

async function run() {
  const args = process.argv.slice(2);
  const uidsArg = getArg(args, "--uids");
  const outArg = getArg(args, "--out");

  if (!uidsArg || !outArg) {
    console.error("Usage: node backup-user.js [--prod] --uids <uid1,uid2> --out <file.json>");
    process.exit(1);
  }

  const uids = uidsArg.split(",").map((s) => s.trim());
  const db = await getDb("companyDB");

  const [users, permissionUsers, permissionAssignments] = await Promise.all([
    db.collection("Users").find({ _id: { $in: uids } }).toArray(),
    db.collection("PermissionUsers").find({ userId: { $in: uids } }).toArray(),
    db.collection("PermissionAssignments").find({ userId: { $in: uids } }).toArray(),
  ]);

  const backup = {
    backedUpAt: new Date().toISOString(),
    uids,
    Users: users,
    PermissionUsers: permissionUsers,
    PermissionAssignments: permissionAssignments,
  };

  fs.writeFileSync(outArg, JSON.stringify(backup, null, 2));
  console.log(`Saved to ${outArg}`);
  console.log(`Users: ${users.length} | PermissionUsers: ${permissionUsers.length} | PermissionAssignments: ${permissionAssignments.length}`);
}

run()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => disconnect().then(() => process.exit(0)));
