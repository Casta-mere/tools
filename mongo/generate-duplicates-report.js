/**
 * generate-duplicates-report.js
 * Reads find-duplicates output and writes an HTML report.
 * Usage: node find-duplicates.js --prod | node generate-duplicates-report.js > report.html
 */

const fs = require("fs");

function esc(s) {
  if (!s) return '<span class="null">—</span>';
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml({ phoneGroups, emailGroups, env, generatedAt }) {
  const phoneRows = phoneGroups
    .map((g, i) => {
      const userRows = g.users
        .map(
          (u) =>
            `<tr class="sub"><td></td><td class="uid">${esc(u.uid)}</td><td>${esc(u.displayName)}</td><td>${esc(u.email)}</td></tr>`
        )
        .join("");
      return `
      <tr class="group" onclick="toggle('p${i}')">
        <td><strong>${esc(g._id)}</strong></td>
        <td class="count">${g.count}</td>
        <td colspan="2" class="expand">▶ click to expand</td>
      </tr>
      <tbody id="p${i}" class="hidden">${userRows}</tbody>`;
    })
    .join("");

  const emailRows = emailGroups
    .map((g, i) => {
      const userRows = g.users
        .map(
          (u) =>
            `<tr class="sub"><td></td><td class="uid">${esc(u.uid)}</td><td>${esc(u.displayName)}</td><td>${esc(u.phone)}</td></tr>`
        )
        .join("");
      return `
      <tr class="group" onclick="toggle('e${i}')">
        <td><strong>${esc(g._id)}</strong></td>
        <td class="count">${g.count}</td>
        <td colspan="2" class="expand">▶ click to expand</td>
      </tr>
      <tbody id="e${i}" class="hidden">${userRows}</tbody>`;
    })
    .join("");

  const totalPhoneUsers = phoneGroups.reduce((s, g) => s + g.count, 0);
  const totalEmailUsers = emailGroups.reduce((s, g) => s + g.count, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Duplicate Users Report — ${env.toUpperCase()} companyDB</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f5f5f7; color: #1d1d1f; }
  header { background: #1d1d1f; color: #fff; padding: 24px 32px; }
  header h1 { margin: 0 0 4px; font-size: 22px; }
  header p { margin: 0; opacity: .6; font-size: 13px; }
  .env-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${env === "prod" ? "#ff3b30" : "#34c759"}; color: #fff; margin-left: 10px; vertical-align: middle; }
  .stats { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
  .stat { background: #fff; border-radius: 12px; padding: 20px 28px; flex: 1; min-width: 180px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .stat .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
  .stat .value { font-size: 36px; font-weight: 700; margin-top: 4px; }
  .stat .sub-value { font-size: 13px; color: #888; margin-top: 2px; }
  .section { padding: 0 32px 32px; }
  h2 { font-size: 18px; margin: 32px 0 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); font-size: 13px; }
  thead th { background: #f0f0f0; text-align: left; padding: 10px 14px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #555; }
  tr.group { cursor: pointer; }
  tr.group:hover { background: #f9f9f9; }
  tr.group td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
  .count { font-weight: 700; color: #ff3b30; }
  .expand { color: #888; font-size: 12px; }
  tr.sub td { padding: 7px 14px 7px 32px; border-bottom: 1px solid #f7f7f7; background: #fafafa; font-size: 12px; }
  .uid { font-family: monospace; color: #555; }
  .null { color: #ccc; }
  .hidden { display: none; }
  footer { text-align: center; color: #aaa; font-size: 12px; padding: 24px; }
</style>
</head>
<body>
<header>
  <h1>Duplicate Users Report <span class="env-badge">${env.toUpperCase()}</span></h1>
  <p>companyDB · Users collection · Generated ${generatedAt}</p>
</header>

<div class="stats">
  <div class="stat">
    <div class="label">Duplicate Phone Groups</div>
    <div class="value">${phoneGroups.length.toLocaleString()}</div>
    <div class="sub-value">${totalPhoneUsers.toLocaleString()} affected user documents</div>
  </div>
  <div class="stat">
    <div class="label">Duplicate Email Groups</div>
    <div class="value">${emailGroups.length.toLocaleString()}</div>
    <div class="sub-value">${totalEmailUsers.toLocaleString()} affected user documents</div>
  </div>
  <div class="stat">
    <div class="label">Max Phone Duplicates</div>
    <div class="value">${phoneGroups[0]?.count ?? 0}</div>
    <div class="sub-value">${esc(phoneGroups[0]?._id)}</div>
  </div>
  <div class="stat">
    <div class="label">Max Email Duplicates</div>
    <div class="value">${emailGroups[0]?.count ?? 0}</div>
    <div class="sub-value">${esc(emailGroups[0]?._id)}</div>
  </div>
</div>

<div class="section">
  <h2>📱 Duplicate Phone Numbers (${phoneGroups.length.toLocaleString()} groups)</h2>
  <table>
    <thead><tr><th>Phone Number</th><th>Count</th><th>Firebase UID</th><th>Display Name / Email</th></tr></thead>
    <tbody>${phoneRows}</tbody>
  </table>

  <h2>✉️ Duplicate Emails (${emailGroups.length.toLocaleString()} groups)</h2>
  <table>
    <thead><tr><th>Email</th><th>Count</th><th>Firebase UID</th><th>Display Name / Phone</th></tr></thead>
    <tbody>${emailRows}</tbody>
  </table>
</div>

<footer>Generated by Claude Code · ${generatedAt}</footer>

<script>
function toggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('hidden');
  const row = el.previousElementSibling;
  const cell = row?.querySelector('.expand');
  if (cell) cell.textContent = el.classList.contains('hidden') ? '▶ click to expand' : '▼ collapse';
}
</script>
</body>
</html>`;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(raw);
  const isProd = process.argv.includes("--prod");
  const html = buildHtml({
    ...data,
    env: isProd ? "prod" : "dev",
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
  });
  process.stdout.write(html);
});
