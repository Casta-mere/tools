/**
 * listResources.js - List Grafana datasources, folders, and dashboards.
 *
 * Usage:
 *   node listResources.js [--limit <n>] [--query <text>] [--json]
 */

const { resolveConfig, requestGrafana } = require("./connect");

function getArg(args, flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

async function getJson(config, apiPath) {
    const response = await requestGrafana({
        ...config,
        apiPath,
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error(
            `Request failed for ${apiPath}: ${response.status} ${response.statusText}`
        );
    }

    return response.body;
}

function printDatasources(items) {
    console.log("\nDatasources:");
    if (!items.length) {
        console.log("  (none)");
        return;
    }

    items.forEach((item) => {
        console.log(
            `  - ${item.name} (uid=${item.uid}, type=${item.type}, default=${Boolean(item.isDefault)})`
        );
    });
}

function printFolders(items) {
    console.log("\nFolders:");
    if (!items.length) {
        console.log("  (none)");
        return;
    }

    items.forEach((item) => {
        console.log(`  - ${item.title} (uid=${item.uid})`);
    });
}

function printDashboards(items) {
    console.log("\nDashboards:");
    if (!items.length) {
        console.log("  (none)");
        return;
    }

    items.forEach((item) => {
        const folder = item.folderTitle || "General";
        console.log(`  - ${item.title} (uid=${item.uid}, folder=${folder})`);
    });
}

async function listResources(options) {
    const args = options.args || [];
    const config = resolveConfig({ isProd: options.isProd, args });

    const limitRaw = getArg(args, "--limit") || "200";
    const limit = parseInt(limitRaw, 10);
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error("--limit must be a positive integer");
    }

    const query = getArg(args, "--query") || "";
    const encodedQuery = encodeURIComponent(query);

    const [datasources, folders, dashboards] = await Promise.all([
        getJson(config, "/api/datasources"),
        getJson(config, "/api/folders?limit=200"),
        getJson(
            config,
            `/api/search?type=dash-db&limit=${limit}&query=${encodedQuery}`
        ),
    ]);

    return {
        env: config.env,
        datasources: datasources.map((d) => ({
            uid: d.uid,
            name: d.name,
            type: d.type,
            isDefault: d.isDefault,
        })),
        folders: folders.map((f) => ({ uid: f.uid, title: f.title })),
        dashboards: dashboards.map((d) => ({
            uid: d.uid,
            title: d.title,
            folderTitle: d.folderTitle,
            url: d.url,
        })),
    };
}

function printUsage() {
    console.log(
        "Usage: node listResources.js [--limit <n>] [--query <text>] [--json]"
    );
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isProd = args.includes("--prod");
    const outputJson = args.includes("--json");

    listResources({ args, isProd })
        .then((result) => {
            if (outputJson) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`Environment: ${result.env}`);
                printDatasources(result.datasources);
                printFolders(result.folders);
                printDashboards(result.dashboards);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error("Failed to list Grafana resources:", error.message);
            printUsage();
            process.exit(1);
        });
}

module.exports = { listResources };
