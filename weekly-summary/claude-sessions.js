#!/usr/bin/env node

/**
 * Parse Claude Code session files to extract session summaries.
 *
 * Usage:
 *   node claude-sessions.js [--days N]
 *
 * Outputs JSON array of sessions with project, date, and first user messages.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const args = process.argv.slice(2);
let days = 7;
const daysIdx = args.indexOf("--days");
if (daysIdx !== -1 && args[daysIdx + 1]) {
  days = parseInt(args[daysIdx + 1], 10) || 7;
}

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const projectsDir = path.join(os.homedir(), ".claude", "projects");

if (!fs.existsSync(projectsDir)) {
  console.log(JSON.stringify([]));
  process.exit(0);
}

const sessions = [];

for (const projName of fs.readdirSync(projectsDir)) {
  const projPath = path.join(projectsDir, projName);
  if (!fs.statSync(projPath).isDirectory()) continue;

  // Convert encoded project name back to readable path
  const readableName = projName.replace(/^-/, "/").replace(/-/g, "/");

  const jsonlFiles = fs
    .readdirSync(projPath)
    .filter((f) => f.endsWith(".jsonl"));

  for (const jsonlFile of jsonlFiles) {
    const filePath = path.join(projPath, jsonlFile);

    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    // Skip files older than cutoff based on mtime for quick filtering
    if (stat.mtime < cutoff) continue;

    const userMessages = [];
    let sessionDate = null;
    let sessionId = jsonlFile.replace(".jsonl", "");
    let entrypoint = null;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        let entry;
        try {
          entry = JSON.parse(line);
        } catch {
          continue;
        }

        if (
          entry.type === "user" &&
          entry.userType === "external" &&
          entry.timestamp
        ) {
          const ts = new Date(entry.timestamp);
          if (ts < cutoff) continue;

          if (!sessionDate) {
            sessionDate = entry.timestamp;
            if (entry.entrypoint) entrypoint = entry.entrypoint;
          }

          // Extract text from message
          let text = "";
          const msg = entry.message;
          if (typeof msg === "string") {
            text = msg;
          } else if (msg && typeof msg === "object") {
            const content = msg.content;
            if (typeof content === "string") {
              text = content;
            } else if (Array.isArray(content)) {
              text = content
                .filter((c) => c && c.type === "text")
                .map((c) => c.text)
                .join("\n");
            }
          }

          // Strip command XML tags, keep meaningful text
          text = text
            .replace(/<command-message>.*?<\/command-message>/gs, "")
            .replace(/<command-name>.*?<\/command-name>/gs, "")
            .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
            .trim();

          if (text && userMessages.length < 5) {
            userMessages.push(text.slice(0, 200));
          }
        }
      }
    } catch {
      continue;
    }

    if (sessionDate && userMessages.length > 0) {
      sessions.push({
        project: readableName,
        date: sessionDate.slice(0, 10),
        entrypoint: entrypoint || "cli",
        sessionId,
        messages: userMessages,
      });
    }
  }
}

// Sort by date descending
sessions.sort((a, b) => b.date.localeCompare(a.date));

console.log(JSON.stringify(sessions, null, 2));
