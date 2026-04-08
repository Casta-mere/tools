/**
 * query.js — Run a find query from the CLI.
 *
 * Usage:
 *   node query.js [--prod] --db <database> --collection <collection> [--filter <json>] [--limit <n>]
 *
 * Examples:
 *   node query.js --db myapp --collection users
 *   node query.js --db myapp --collection users --filter '{"role":"admin"}' --limit 5
 *   node query.js --prod --db myapp --collection orders --limit 10
 */

const { getDb, disconnect } = require("./index");

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function printUsage() {
  console.log(
    "Usage: node query.js [--prod] --db <database> --collection <collection> [--filter <json>] [--limit <n>]"
  );
  console.log(
    'Example: node query.js --db myapp --collection users --filter \'{"role":"admin"}\' --limit 5'
  );
}

async function runQuery({ db: dbName, collection: colName, filter, limit }) {
  const db = await getDb(dbName);
  const col = db.collection(colName);

  const parsedFilter = filter ? JSON.parse(filter) : {};
  const parsedLimit = limit ? parseInt(limit, 10) : 20;

  const docs = await col.find(parsedFilter).limit(parsedLimit).toArray();
  console.log(JSON.stringify(docs, null, 2));
  console.log(`\n(${docs.length} document${docs.length !== 1 ? "s" : ""})`);
  return docs;
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => a !== "--prod");

  const dbName = getArg(args, "--db");
  const colName = getArg(args, "--collection");

  if (!dbName || !colName) {
    printUsage();
    process.exit(1);
  }

  const filter = getArg(args, "--filter");
  const limit = getArg(args, "--limit");

  runQuery({ db: dbName, collection: colName, filter, limit })
    .catch((err) => {
      console.error("Query failed:", err.message);
      process.exit(1);
    })
    .finally(() => disconnect().then(() => process.exit(0)));
}

module.exports = { runQuery };
