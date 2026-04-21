/**
 * findFirstDuplicate.js
 * Finds when duplicate phone-number Users first appeared by querying
 * Firebase Auth creation times for all UIDs in the duplicate groups.
 *
 * Usage: node findFirstDuplicate.js [--prod]
 */
const admin = require("firebase-admin");
const fs = require("fs");

const isProd = process.argv.includes("--prod");
const keyFile = isProd ? "./firebaseKey-prod.json" : "./firebaseKey-dev.json";
const serviceAccount = require(keyFile);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
if (isProd) console.error("⚠ Using PROD Firebase\n");

async function batchGetUsers(uids) {
  const identifiers = uids.map((uid) => ({ uid }));
  const result = await admin.auth().getUsers(identifiers);
  return result.users; // UserRecord[]
}

async function main() {
  const groups = JSON.parse(
    fs.readFileSync(
      "/Users/wangxugang/Dev/tools/mongo/duplicate-phones-real.json",
      "utf8"
    )
  );

  // Collect all unique UIDs
  const allUids = [...new Set(groups.flatMap((g) => g.users.map((u) => u.uid)))];
  console.error(`Fetching creation times for ${allUids.length} UIDs in ${Math.ceil(allUids.length / 100)} batches...`);

  // Batch fetch 100 at a time
  const uidToCreatedAt = {};
  for (let i = 0; i < allUids.length; i += 100) {
    const batch = allUids.slice(i, i + 100);
    const records = await batchGetUsers(batch);
    for (const r of records) {
      uidToCreatedAt[r.uid] = new Date(r.metadata.creationTime).getTime();
    }
    if ((i / 100 + 1) % 10 === 0) {
      console.error(`  ${i + 100}/${allUids.length} done...`);
    }
  }

  console.error(`Got creation times for ${Object.keys(uidToCreatedAt).length} UIDs`);

  // For each group, sort UIDs by createdAt, the 2nd+ are "duplicates"
  let earliestDuplicate = null;

  const groupsWithTimes = groups
    .map((g) => {
      const users = g.users
        .map((u) => ({
          ...u,
          createdAt: uidToCreatedAt[u.uid] || null,
        }))
        .filter((u) => u.createdAt !== null)
        .sort((a, b) => a.createdAt - b.createdAt);

      if (users.length < 2) return null;

      // The second (and beyond) are the "duplicates"
      const duplicates = users.slice(1);
      const firstDupTime = duplicates[0].createdAt;

      if (!earliestDuplicate || firstDupTime < earliestDuplicate.createdAt) {
        earliestDuplicate = {
          phone: g._id,
          originalUid: users[0].uid,
          originalCreatedAt: new Date(users[0].createdAt).toISOString(),
          duplicateUid: duplicates[0].uid,
          createdAt: firstDupTime,
          createdAtIso: new Date(firstDupTime).toISOString(),
        };
      }

      return {
        phone: g._id,
        count: g.count,
        users: users.map((u) => ({
          uid: u.uid,
          createdAt: new Date(u.createdAt).toISOString(),
          email: u.email,
        })),
        firstDuplicateAt: new Date(firstDupTime).toISOString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.firstDuplicateAt) - new Date(b.firstDuplicateAt));

  // Summary stats
  const byMonth = {};
  for (const g of groupsWithTimes) {
    const month = g.firstDuplicateAt.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        earliestDuplicate,
        totalGroups: groupsWithTimes.length,
        byMonth,
        earliest10: groupsWithTimes.slice(0, 10),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => admin.app().delete());
