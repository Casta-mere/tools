---
name: weekly-summary
description: Generate a weekly work report in the user's team-report style — "Dear Team" letter format with Completed and Plans sections
user_invocable: true
---

# Weekly Work Summary

Generate a work report for the past week in the user's established team-report style.

## Arguments

- `$ARGUMENTS` may contain:
  - `--days N` — look back N days instead of the default 7
  - One or more GitHub org or repo names to filter
  - Copilot session summaries (see Step 3b)

## Steps

### 1. Determine parameters

- Default lookback: 7 days
- If `$ARGUMENTS` contains `--days N`, use N days
- Calculate the since date: `$(date -v-Nd +%Y-%m-%d)` where N is days
- GitHub user: run `gh api user --jq '.login'` to get username
- Date range label: format as "Mon DD – Mon DD, YYYY" (e.g. "Apr 10 – Apr 17, 2026")

### 2. Fetch GitHub activity

**Commits:**
```bash
gh api search/commits --method GET -f q="author:USERNAME author-date:>=SINCE_DATE" -f sort=author-date -f per_page=100 --jq '.items[] | {repo: .repository.full_name, message: .commit.message, date: .commit.author.date}'
```

**Pull requests (authored):**
```bash
gh api search/issues --method GET -f q="author:USERNAME type:pr created:>=SINCE_DATE" -f sort=created -f per_page=100 --jq '.items[] | {repo: (.repository_url | split("/") | .[-2:] | join("/")), number: .number, title: .title, state: .state}'
```

**Pull requests (reviewed):**
```bash
gh api search/issues --method GET -f q="reviewed-by:USERNAME type:pr updated:>=SINCE_DATE" -f sort=updated -f per_page=100 --jq '.items[] | {repo: (.repository_url | split("/") | .[-2:] | join("/")), number: .number, title: .title, state: .state}'
```

### 3a. Fetch Claude Code sessions

```bash
node {{REPO_ROOT}}/weekly-summary/claude-sessions.js --days N
```

Use the session messages to understand intent and context — ignore system noise, command invocations, and shell output.

### 3b. Copilot sessions (optional)

If `$ARGUMENTS` contains Copilot session summaries, incorporate them.

If not, after generating the report, prompt:

> No Copilot data included. If you'd like to add Copilot activity, ask Copilot:
> _"Summarize all our chat sessions from the past week. For each session: project/repo, what was worked on, outcome. 1–2 sentences each."_
> Then re-run `/weekly-summary` and paste the output as an argument.

### 4. Ask for plans and any missing context

Before generating, ask:

> **Before I write the report — a couple of quick questions:**
> 1. What are your **plans for next period**? (bullet points are fine)
> 2. Any **meetings, syncs, or prod incidents** this week not captured in commits? (optional)

Wait for the user's reply, then generate the report.

### 5. Generate the report

Use this exact format — professional, concise, achievement-focused:

```
Dear Team,

Here is my work report for [DATE RANGE].

**Completed This Period:**

1. [Achievement bullet]
2. [Achievement bullet]
...

**Plans for Next Period:**

1. [Plan bullet]
2. [Plan bullet]
...

Best regards,
Xugang Wang
```

## Writing rules

**What to write:**
- Group related commits/PRs/sessions into a single thematic bullet — never list individual commits
- Bold the feature/project name at the start of each bullet (e.g. **Report Permissions**, **ActionGuard**)
- Use @Name for collaborators mentioned in commits, PRs, or sessions
- Lead with the accomplishment verb: "Finalized", "Implemented", "Shipped", "Proposed", "Debugged", "Published", "Designed & Implemented"
- For prod fixes, group into one bullet: "Fixed N prod issues — [brief description of each]"
- Keep each bullet to 1–2 lines; omit implementation details
- Infer intent from Claude session messages — use them for context, not content

**What NOT to write:**
- No repo names, no commit hashes, no PR numbers
- No "By Project" sections or tables
- No AI session details or tool invocations
- No sub-bullets (keep it flat)
- No filler words like "various", "several", "multiple"
- Don't expose that Claude sessions were used as a source

**Tone:** Professional team update. Direct, factual, no hype.

## Example bullet patterns (for reference)

- Shipped **Report Permissions** feature — dynamic allDefaultReports/allCustomReports cover checkboxes, stale permission filter with warnings, redundant action stripping on save, and DB migration scripts
- Published **HRM Action Guard** and **HRM Permission** as independent npm packages with CI/CD via GitHub Actions with @Junlee
- Fixed 3 prod issues — portal user update failure, audit log subject filter, team member display bug
- Attended **POS-v8 AI agent** team meeting — discussed testing framework architecture and agent-based platform direction
- Built AI utility tools — Firebase, MongoDB, HRM version lookup, and Grafana connectivity utilities with Claude Code slash commands
