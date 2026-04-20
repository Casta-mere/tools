const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const isProd = process.argv.includes("--prod");
const isLocal = process.argv.includes("--local");
const MONGO_URL = isProd
  ? process.env.MONGO_URL_PROD
  : isLocal
  ? process.env.MONGO_URL_LOCAL
  : process.env.MONGO_URL_DEV;

if (!MONGO_URL) {
  console.error(
    isProd
      ? "MONGO_URL_PROD is not set in mongo/.env"
      : isLocal
      ? "MONGO_URL_LOCAL is not set in mongo/.env"
      : "MONGO_URL_DEV is not set in mongo/.env"
  );
  process.exit(1);
}

let client = null;

/**
 * Get a connected MongoClient (singleton).
 * @returns {Promise<MongoClient>}
 */
async function connect() {
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
  }
  return client;
}

/**
 * Get a Db instance by name.
 * @param {string} dbName
 * @returns {Promise<import("mongodb").Db>}
 */
async function getDb(dbName) {
  const c = await connect();
  return c.db(dbName);
}

/**
 * Close the connection.
 */
async function disconnect() {
  if (client) {
    await client.close();
    client = null;
  }
}

/**
 * List all databases on the server.
 * @returns {Promise<string[]>}
 */
async function listDatabases() {
  const c = await connect();
  const { databases } = await c.db().admin().listDatabases();
  return databases.map((d) => d.name);
}

// CLI: list databases
if (require.main === module) {
  if (isProd) {
    console.log("⚠ Using PROD MongoDB\n");
  } else if (isLocal) {
    console.log("⚠ Using LOCAL MongoDB\n");
  }

  listDatabases()
    .then((dbs) => {
      console.log("Databases:");
      dbs.forEach((name) => console.log(" -", name));
    })
    .catch((err) => {
      console.error("Connection failed:", err.message);
      process.exit(1);
    })
    .finally(() => disconnect().then(() => process.exit(0)));
}

module.exports = { connect, getDb, disconnect, listDatabases };
