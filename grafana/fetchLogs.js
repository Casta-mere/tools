/**
 * fetchLogs.js - Fetch logs from Grafana datasource query and export as .log or .jsonl.
 *
 * Usage:
 *   node fetchLogs.js --from <iso> --to <iso> --service <name> --namespace <name> --cluster <name>
 *     [--level <severity_number|$__all>] [--maxRows <n>] [--query <text>] [--output <path>] [--format log|jsonl] [--repr]
 */

const fs = require("fs");
const path = require("path");
const { resolveConfig, requestGrafana } = require("./connect");

const DEFAULT_DASHBOARD_UID = "de5p5kiexc2dca";
const DEFAULT_FROM = "2026-04-08T16:00:00.000Z";
const DEFAULT_TO = "2026-04-09T15:59:59.000Z";

function getArg(args, flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function escapeSingleQuotes(value) {
    return String(value).replace(/'/g, "\\'");
}

function severityNumberToLabel(value) {
    const map = {
        9: "INFO",
        11: "WARNING",
        13: "WARN",
        17: "ERROR",
    };
    return map[value] || `SEV_${value}`;
}

async function getDashboardByUid(config, uid) {
    const response = await requestGrafana({
        ...config,
        apiPath: `/api/dashboards/uid/${uid}`,
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error(
            `Failed to fetch dashboard ${uid}: ${response.status} ${response.statusText}`
        );
    }

    return response.body;
}

function getLogsTarget(dashboard) {
    const panels = dashboard?.dashboard?.panels || [];
    const logsPanel = panels.find((panel) => panel.type === "logs");
    const target = logsPanel?.targets?.[0];

    if (!logsPanel || !target) {
        throw new Error("No logs panel target found in dashboard");
    }

    return {
        datasource: logsPanel.datasource || target.datasource,
        target,
    };
}

function buildQueryString({ service, cluster, namespace, level, queryText }) {
    const parts = [
        `service_name:'${escapeSingleQuotes(service)}'`,
        `attributes.cluster:'${escapeSingleQuotes(cluster)}'`,
        `attributes.namespace:'${escapeSingleQuotes(namespace)}'`,
    ];

    const normalizedLevel = (level || "$__all").trim();
    if (!["$__all", "*", ""].includes(normalizedLevel)) {
        parts.splice(
            1,
            0,
            `severity_number:'${escapeSingleQuotes(normalizedLevel)}'`
        );
    }

    if (queryText) {
        parts.push(queryText);
    }

    parts.push('-attributes.job:"k8s-events"');
    return parts.join(" ");
}

function buildDsQueryPayload({ from, to, datasource, target, query, maxRows }) {
    return {
        from,
        to,
        queries: [
            {
                refId: target.refId || "A",
                datasource,
                query,
                metrics: [
                    {
                        id: "3",
                        type: "logs",
                        settings: {
                            limit: String(maxRows),
                            sortDirection: "desc",
                        },
                    },
                ],
                bucketAggs: [
                    {
                        field: "",
                        id: "2",
                        settings: {
                            interval: "auto",
                        },
                        type: "date_histogram",
                    },
                ],
                timeField: "",
                alias: "",
                intervalMs: 60000,
                maxDataPoints: 1000,
            },
        ],
    };
}

function frameToRows(frame) {
    const fieldNames = frame.schema.fields.map((field) => field.name);
    const values = frame.data.values;
    const rowCount = values[0]?.length || 0;

    const idx = (name) => fieldNames.indexOf(name);

    const result = [];
    for (let i = 0; i < rowCount; i += 1) {
        const severity = values[idx("severity_number")]?.[i] ?? null;
        result.push({
            timestamp_ms: values[idx("timestamp_nanos")]?.[i] ?? null,
            cluster: values[idx("attributes.cluster")]?.[i] ?? null,
            namespace: values[idx("attributes.namespace")]?.[i] ?? null,
            pod: values[idx("attributes.pod")]?.[i] ?? null,
            service: values[idx("service_name")]?.[i] ?? null,
            severity_number: severity,
            severity: severityNumberToLabel(severity),
            message: values[idx("body.message")]?.[i] ?? "",
        });
    }

    return result;
}

function toLogLine(row, useRepr = false) {
    const iso = row.timestamp_ms ? new Date(row.timestamp_ms).toISOString() : "-";
    const msg = useRepr ? JSON.stringify(row.message) : row.message;
    return `[${iso}] [${row.severity}] [${row.pod || "-"}] ${msg}`;
}

function writeOutput({ rows, format, outputPath, useRepr }) {
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    if (format === "jsonl") {
        const content = rows.map((row) => JSON.stringify(row)).join("\n");
        fs.writeFileSync(outputPath, `${content}\n`, "utf8");
        return;
    }

    const content = rows.map((row) => toLogLine(row, useRepr)).join("\n");
    fs.writeFileSync(outputPath, `${content}\n`, "utf8");
}

function defaultOutputPath({ format, service, from, to }) {
    const safe = (v) => v.replace(/[.:]/g, "-");
    const ext = format === "jsonl" ? "jsonl" : "log";
    return path.join(
        __dirname,
        "output",
        `service-logs-${service}-${safe(from)}_to_${safe(to)}.${ext}`
    );
}

function printUsage() {
    console.log(
        "Usage: node fetchLogs.js --from <iso> --to <iso> --service <name> --namespace <name> --cluster <name> [--level <severity_number|$__all>] [--maxRows <n>] [--query <text>] [--output <path>] [--format log|jsonl] [--repr]"
    );
}

async function fetchLogs(options) {
    const args = options.args || [];
    const dashboardUid = getArg(args, "--dashboard") || DEFAULT_DASHBOARD_UID;
    const service = getArg(args, "--service") || "hr-backend";
    const namespace = getArg(args, "--namespace") || "apps-my";
    const cluster = getArg(args, "--cluster") || "production";
    const level = getArg(args, "--level") || "$__all";
    const queryText = getArg(args, "--query") || "";
    const format = (getArg(args, "--format") || "log").toLowerCase();
    const from = getArg(args, "--from") || DEFAULT_FROM;
    const to = getArg(args, "--to") || DEFAULT_TO;
    const maxRowsRaw = getArg(args, "--maxRows") || "10000";
    const maxRows = parseInt(maxRowsRaw, 10);
    const useRepr = args.includes("--repr");

    if (!Number.isInteger(maxRows) || maxRows <= 0) {
        throw new Error("--maxRows must be a positive integer");
    }

    if (!["log", "jsonl"].includes(format)) {
        throw new Error("--format must be either 'log' or 'jsonl'");
    }

    const config = resolveConfig({ isProd: options.isProd, args });
    const dashboard = await getDashboardByUid(config, dashboardUid);
    const { datasource, target } = getLogsTarget(dashboard);

    const query = buildQueryString({
        service,
        cluster,
        namespace,
        level,
        queryText,
    });

    const payload = buildDsQueryPayload({
        from,
        to,
        datasource,
        target,
        query,
        maxRows,
    });

    const queryResponse = await requestGrafana({
        ...config,
        apiPath: "/api/ds/query",
        method: "POST",
        body: payload,
    });

    if (queryResponse.status < 200 || queryResponse.status >= 300) {
        throw new Error(
            `Datasource query failed: ${queryResponse.status} ${queryResponse.statusText}`
        );
    }

    const frame = queryResponse.body?.results?.A?.frames?.[0];
    if (!frame) {
        throw new Error("No frames returned from datasource query");
    }

    const rows = frameToRows(frame);
    const outputPath =
        getArg(args, "--output") ||
        defaultOutputPath({ format, service, from, to });

    writeOutput({ rows, format, outputPath, useRepr });

    const severityStats = rows.reduce((acc, row) => {
        const key = row.severity;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return {
        outputPath,
        count: rows.length,
        severityStats,
        query,
    };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isProd = args.includes("--prod");

    fetchLogs({ args, isProd })
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error("Failed to fetch logs:", error.message);
            printUsage();
            process.exit(1);
        });
}

module.exports = {
    fetchLogs,
    buildQueryString,
    frameToRows,
    toLogLine,
};
