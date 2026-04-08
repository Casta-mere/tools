/**
 * update.js — Run an update against MongoDB with safety previews.
 *
 * Usage:
 *   node update.js [--prod] --db <database> --collection <collection> --filter <json> --update <json> [--limit <n>] [--dry-run]
 *
 * The script ALWAYS prints matching documents first. With --dry-run it stops there.
 * Without --dry-run it proceeds to apply the update and reports matchedCount / modifiedCount.
 *
 * Examples:
 *   # Preview only (no changes)
 *   node update.js --db myapp --collection users --filter '{"role":"admin"}' --update '{"$set":{"active":true}}' --dry-run
 *
 *   # Actually update (still prints preview first)
 *   node update.js --db myapp --collection users --filter '{"role":"admin"}' --update '{"$set":{"active":true}}'
 *
 *   # Limit how many documents get updated (uses updateMany on the limited set)
 *   node update.js --db myapp --collection users --filter '{"role":"admin"}' --update '{"$set":{"active":true}}' --limit 5
 */

const { getDb, disconnect } = require("./index");

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function printUsage() {
  console.log(
    "Usage: node update.js [--prod] --db <database> --collection <collection> --filter <json> --update <json> [--limit <n>] [--dry-run]"
  );
  console.log(
    'Example: node update.js --db myapp --collection users --filter \'{"role":"admin"}\' --update \'{"$set":{"active":true}}\' --dry-run'
  );
}

/**
 * Preview matching documents without making changes.
 * @returns {Promise<object[]>} matched documents
 */
async function preview({ db: dbName, collection: colName, filter, limit }) {
  const db = await getDb(dbName);
  const col = db.collection(colName);

  const parsedFilter = JSON.parse(filter);
  const previewLimit = limit ? parseInt(limit, 10) : 20;

  const totalCount = await col.countDocuments(parsedFilter);
  const docs = await col.find(parsedFilter).limit(previewLimit).toArray();

  console.log(`\n--- PREVIEW: ${totalCount} document(s) match the filter ---`);
  if (totalCount > previewLimit) {
    console.log(`(showing first ${previewLimit})\n`);
  } else {
    console.log();
  }
  console.log(JSON.stringify(docs, null, 2));

  return { docs, totalCount };
}

/**
 * Run the update and return the result.
 */
async function runUpdate({
  db: dbName,
  collection: colName,
  filter,
  update,
  limit,
}) {
  const db = await getDb(dbName);
  const col = db.collection(colName);

  const parsedFilter = JSON.parse(filter);
  const parsedUpdate = JSON.parse(update);

  // If a limit is specified, fetch the _ids of matching docs and scope the update to those
  if (limit) {
    const cap = parseInt(limit, 10);
    const ids = await col
      .find(parsedFilter, { projection: { _id: 1 } })
      .limit(cap)
      .toArray();
    const scopedFilter = { _id: { $in: ids.map((d) => d._id) } };
    const result = await col.updateMany(scopedFilter, parsedUpdate);
    return result;
  }

  const result = await col.updateMany(parsedFilter, parsedUpdate);
  return result;
}

if (require.main === module) {
  const isProd = process.argv.includes("--prod");
  const isDryRun = process.argv.includes("--dry-run");
  const args = process.argv
    .slice(2)
    .filter((a) => a !== "--prod" && a !== "--dry-run");

  const dbName = getArg(args, "--db");
  const colName = getArg(args, "--collection");
  const filter = getArg(args, "--filter");
  const update = getArg(args, "--update");
  const limit = getArg(args, "--limit");

  if (!dbName || !colName || !filter) {
    printUsage();
    process.exit(1);
  }

  // Reject empty filter to prevent accidental mass updates
  try {
    const parsed = JSON.parse(filter);
    if (Object.keys(parsed).length === 0) {
      console.error(
        "ERROR: Empty filter {} is not allowed — it would match every document in the collection."
      );
      console.error(
        "If you truly need to update all documents, add an explicit filter that matches them."
      );
      process.exit(1);
    }
  } catch (e) {
    console.error("ERROR: Invalid JSON in --filter:", e.message);
    process.exit(1);
  }

  if (isProd) {
    console.log("========================================");
    console.log("  WARNING: TARGETING PRODUCTION DATABASE");
    console.log("========================================\n");
  }

  (async () => {
    // Always preview first
    const { totalCount } = await preview({
      db: dbName,
      collection: colName,
      filter,
      limit,
    });

    if (isDryRun) {
      console.log("\n[DRY RUN] No changes were made.");
      return;
    }

    if (!update) {
      console.error(
        "\nERROR: --update is required when not using --dry-run."
      );
      printUsage();
      process.exit(1);
    }

    // Validate update JSON
    try {
      JSON.parse(update);
    } catch (e) {
      console.error("ERROR: Invalid JSON in --update:", e.message);
      process.exit(1);
    }

    const effectiveCount = limit
      ? Math.min(parseInt(limit, 10), totalCount)
      : totalCount;

    console.log(`\n--- EXECUTING UPDATE on ${effectiveCount} document(s) ---`);
    console.log(`Update operation: ${update}\n`);

    const result = await runUpdate({
      db: dbName,
      collection: colName,
      filter,
      update,
      limit,
    });

    console.log("Result:");
    console.log(`  matchedCount:  ${result.matchedCount}`);
    console.log(`  modifiedCount: ${result.modifiedCount}`);
  })()
    .catch((err) => {
      console.error("Update failed:", err.message);
      process.exit(1);
    })
    .finally(() => disconnect().then(() => process.exit(0)));
}

module.exports = { preview, runUpdate };
