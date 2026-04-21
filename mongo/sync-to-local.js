/**
 * sync-to-local.js — Copy collections from DEV or PROD to local MongoDB (drop & replace).
 * Destination is always LOCAL. Syncing TO dev/prod is not supported.
 *
 * Usage: node sync-to-local.js [--prod] --db <database> --collections <col1,col2,...>
 *
 * Flags:
 *   --prod          Use PROD as source (default: DEV)
 *   --db            Database name
 *   --collections   Comma-separated list of collections to sync
 */
const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const isProd = process.argv.includes("--prod");

const SOURCE_URL = isProd
  ? process.env.MONGO_URL_PROD
  : process.env.MONGO_URL_DEV;
const LOCAL_URL = process.env.MONGO_URL_LOCAL;
const SOURCE_LABEL = isProd ? "PROD" : "DEV";

if (!SOURCE_URL) {
  console.error(
    isProd
      ? "MONGO_URL_PROD is not set in mongo/.env"
      : "MONGO_URL_DEV is not set in mongo/.env",
  );
  process.exit(1);
}
if (!LOCAL_URL) {
  console.error("MONGO_URL_LOCAL is not set in mongo/.env");
  process.exit(1);
}

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

async function sync(dbName, collections) {
  const sourceClient = new MongoClient(SOURCE_URL);
  const localClient = new MongoClient(LOCAL_URL);

  await sourceClient.connect();
  await localClient.connect();
  console.log(`Connected to ${SOURCE_LABEL} and LOCAL\n`);

  const sourceDb = sourceClient.db(dbName);
  const localDb = localClient.db(dbName);

  for (const colName of collections) {
    process.stdout.write(`Fetching ${colName} from ${SOURCE_LABEL}... `);
    const docs = await sourceDb.collection(colName).find({}).toArray();
    console.log(`${docs.length} documents`);

    process.stdout.write(`Dropping ${colName} in LOCAL... `);
    await localDb
      .collection(colName)
      .drop()
      .catch((err) => { if (err.code !== 26) throw err; });
    console.log("done");

    if (docs.length > 0) {
      process.stdout.write(`Inserting into LOCAL ${colName}... `);
      const result = await localDb.collection(colName).insertMany(docs);
      console.log(`${result.insertedCount} inserted`);
    }
    console.log();
  }

  await sourceClient.close();
  await localClient.close();
  console.log("Sync complete");
}

const args = process.argv.slice(2).filter((a) => a !== "--prod");
const dbName = getArg(args, "--db");
const colsArg = getArg(args, "--collections");

if (!dbName || !colsArg) {
  console.log(
    "Usage: node sync-to-local.js [--prod] --db <database> --collections <col1,col2>",
  );
  process.exit(1);
}

if (isProd) {
  console.warn(`⚠  Syncing from PRODUCTION to LOCAL\n`);
}

const collections = [...new Set(colsArg.split(",").map((c) => c.trim()).filter(Boolean))];

if (collections.length === 0) {
  console.error(
    "No valid collections provided. Use --collections <col1,col2,...> with at least one non-empty collection name.",
  );
  process.exit(1);
}

sync(dbName, collections).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
