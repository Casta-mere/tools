const { getHrmVersions } = require("./hrmVersion");

function printDeprecationWarning() {
  console.warn(
    "packageVersion.js is deprecated. Use hrmVersion.js for the full HRM version set.",
  );
}

function printUsage() {
  console.log(
    "Usage: node packageVersion.js [--prod] <package> [package...]",
  );
  console.log(
    "Example: node packageVersion.js mf-hrm-portal hrm-permission hrm-actionguard",
  );
}

async function main() {
  const isProd = process.argv.includes("--prod");
  const args = process.argv.slice(2).filter((arg) => arg !== "--prod");

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  printDeprecationWarning();

  const env = isProd ? "prod" : "dev";
  const results = await getHrmVersions({ env, targets: args });

  console.log(JSON.stringify({ env, results }, null, 2));
}

module.exports = {
  main,
};
