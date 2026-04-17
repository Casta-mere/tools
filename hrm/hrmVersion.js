const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const PORTAL_REPO = {
  owner: "feedmepos",
  repo: "portal",
  ref: "ci",
  envPaths: {
    dev: "ci/dev/package_versions.json",
    prod: "ci/prod/package_versions.json",
  },
};

const GITOPS_REPO = {
  owner: "feedmepos",
  repo: "gitops-apps",
  ref: "main",
  envPaths: {
    dev: "clusters/dev/MY/hr-backend.yaml",
    prod: "clusters/production/MY/hr-backend.yaml",
  },
};

const DEFAULT_TARGETS = [
  "mf-hrm-portal",
  "hrm-permission",
  "hrm-actionguard",
  "hr-backend",
];

function normalizePortalPackageName(name) {
  if (!name) {
    return name;
  }

  return name.startsWith("@feedmepos/") ? name : `@feedmepos/${name}`;
}

async function fetchGitHubFile({ owner, repo, ref, path }) {
  try {
    const { stdout } = await execFileAsync("gh", [
      "api",
      `repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      "--jq",
      ".content",
    ]);

    return Buffer.from(stdout.replace(/\s+/g, ""), "base64").toString("utf8");
  } catch (error) {
    const stderr = error.stderr ? ` ${error.stderr.trim()}` : "";
    throw new Error(
      `Failed to fetch ${owner}/${repo}:${path} via gh api.${stderr}`,
    );
  }
}

async function fetchPortalVersionMap(env = "dev") {
  const path = PORTAL_REPO.envPaths[env];

  if (!path) {
    throw new Error(`Unsupported environment: ${env}`);
  }

  const content = await fetchGitHubFile({
    ...PORTAL_REPO,
    path,
  });

  return JSON.parse(content);
}

async function fetchHrBackendVersion(env = "dev") {
  const path = GITOPS_REPO.envPaths[env];

  if (!path) {
    throw new Error(`Unsupported environment: ${env}`);
  }

  const content = await fetchGitHubFile({
    ...GITOPS_REPO,
    path,
  });

  const match = content.match(/^\s*tag:\s*"?([^"\n]+)"?\s*$/m);

  if (!match) {
    throw new Error(`Could not find image tag in ${path}`);
  }

  return match[1];
}

async function getHrmVersions({ env = "dev", targets = DEFAULT_TARGETS }) {
  const normalizedTargets = targets.length > 0 ? targets : DEFAULT_TARGETS;
  const needsPortalVersions = normalizedTargets.some(
    (target) => target !== "hr-backend",
  );

  const [portalVersions, hrBackendVersion] = await Promise.all([
    needsPortalVersions ? fetchPortalVersionMap(env) : Promise.resolve(null),
    fetchHrBackendVersion(env),
  ]);

  return normalizedTargets.map((target) => {
    if (target === "hr-backend") {
      return {
        name: "hr-backend",
        source: "gitops-apps",
        version: hrBackendVersion,
      };
    }

    const packageName = normalizePortalPackageName(target);
    return {
      name: packageName,
      source: "portal",
      version: portalVersions?.[packageName] ?? null,
    };
  });
}

function printUsage() {
  console.log(
    "Usage: node hrmVersion.js [--prod] [mf-hrm-portal hrm-permission hrm-actionguard hr-backend]",
  );
  console.log(
    "Example: node hrmVersion.js",
  );
  console.log(
    "         node hrmVersion.js --prod",
  );
  console.log(
    "         node hrmVersion.js mf-hrm-portal hrm-permission hrm-actionguard hr-backend",
  );
}

async function main() {
  const isProd = process.argv.includes("--prod");
  const args = process.argv.slice(2).filter((arg) => arg !== "--prod");
  const env = isProd ? "prod" : "dev";

  const results = await getHrmVersions({
    env,
    targets: args.length > 0 ? args : DEFAULT_TARGETS,
  });

  console.log(JSON.stringify({ env, results }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    printUsage();
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_TARGETS,
  fetchGitHubFile,
  fetchPortalVersionMap,
  fetchHrBackendVersion,
  getHrmVersions,
  normalizePortalPackageName,
};
