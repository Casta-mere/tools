/**
 * connect.js - Check Grafana connectivity and call Grafana HTTP API.
 *
 * Usage:
 *   node connect.js [--prod] [--url <grafana_url>] [--token <api_token>] [--path <api_path>] [--timeout <ms>] [--insecure]
 *
 * Examples:
 *   node connect.js
 *   node connect.js --prod
 *   node connect.js --path /api/org
 *   node connect.js --url https://grafana.example.com --token <TOKEN> --path /api/search
 */

const path = require("path");
const http = require("http");
const https = require("https");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_API_PATH = "/api/health";

function getArg(args, flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function resolveConfig({ isProd, args }) {
    const explicitUrl = getArg(args, "--url");
    const explicitToken = getArg(args, "--token");
    const apiPath = getArg(args, "--path") || DEFAULT_API_PATH;
    const timeoutArg = getArg(args, "--timeout");

    const env = "default";
    const baseUrl =
        explicitUrl ||
        process.env.GRAFANA_URL ||
        (isProd ? process.env.GRAFANA_URL_PROD : process.env.GRAFANA_URL_DEV);
    const token =
        explicitToken ||
        process.env.GRAFANA_TOKEN ||
        (isProd ? process.env.GRAFANA_TOKEN_PROD : process.env.GRAFANA_TOKEN_DEV);

    const timeoutMs = timeoutArg ? parseInt(timeoutArg, 10) : DEFAULT_TIMEOUT_MS;

    if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
        throw new Error("--timeout must be a positive integer in milliseconds");
    }

    if (!baseUrl) {
        const missing = "GRAFANA_URL";
        throw new Error(
            `${missing} is not set. Add it to grafana/.env or pass --url <grafana_url>.`
        );
    }

    return {
        env,
        baseUrl,
        token,
        apiPath,
        timeoutMs,
        insecure: args.includes("--insecure"),
    };
}

function ensureValidApiPath(apiPath) {
    if (!apiPath.startsWith("/")) {
        return `/${apiPath}`;
    }
    return apiPath;
}

function requestGrafana({
    baseUrl,
    token,
    apiPath,
    method = "GET",
    extraHeaders = {},
    body,
    timeoutMs,
    insecure = false,
}) {
    const normalizedPath = ensureValidApiPath(apiPath);
    const url = new URL(normalizedPath, baseUrl);

    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const headers = {
        Accept: "application/json",
        ...extraHeaders,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
        timeout: timeoutMs,
    };

    if (isHttps && insecure) {
        options.rejectUnauthorized = false;
    }

    return new Promise((resolve, reject) => {
        const req = client.request(url, options, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                let parsedBody = body;

                try {
                    parsedBody = body ? JSON.parse(body) : null;
                } catch (_) {
                    // Keep raw body when response is not JSON.
                }

                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: parsedBody,
                });
            });
        });

        req.on("timeout", () => {
            req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });

        req.on("error", (error) => {
            reject(error);
        });

        if (body !== undefined && body !== null) {
            const serializedBody =
                typeof body === "string" ? body : JSON.stringify(body);

            if (!headers["Content-Type"]) {
                req.setHeader("Content-Type", "application/json");
            }
            req.setHeader("Content-Length", Buffer.byteLength(serializedBody));
            req.write(serializedBody);
        }

        req.end();
    });
}

async function connectGrafana(options) {
    const config = resolveConfig(options);
    const response = await requestGrafana(config);

    const ok = response.status >= 200 && response.status < 300;

    return {
        env: config.env,
        url: new URL(ensureValidApiPath(config.apiPath), config.baseUrl).toString(),
        ok,
        status: response.status,
        statusText: response.statusText,
        body: response.body,
    };
}

function printUsage() {
    console.log(
        "Usage: node connect.js [--url <grafana_url>] [--token <api_token>] [--path <api_path>] [--timeout <ms>] [--insecure]"
    );
    console.log("Examples:");
    console.log("  node connect.js");
    console.log("  node connect.js --path /api/org");
    console.log(
        "  node connect.js --url https://grafana.example.com --token <TOKEN> --path /api/search"
    );
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isProd = args.includes("--prod");

    connectGrafana({ isProd, args })
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));

            if (!result.ok) {
                if (result.status === 401 || result.status === 403) {
                    console.error(
                        "Authentication failed. Check GRAFANA_TOKEN_DEV/GRAFANA_TOKEN_PROD or pass --token."
                    );
                }
                process.exit(1);
            }

            process.exit(0);
        })
        .catch((error) => {
            console.error("Grafana connection failed:", error.message);
            printUsage();
            process.exit(1);
        });
}

module.exports = {
    connectGrafana,
    requestGrafana,
    resolveConfig,
};
