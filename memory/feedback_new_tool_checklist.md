---
name: New tool checklist
description: When adding a new tool to this repo, always include env/credential template, setup.sh tip, and README docs
type: feedback
---

When a new tool directory is added to this repo, always do all of the following before considering the work done:

1. **`.env.template`** — if the tool needs environment variables, create `<dir>/.env.template` with placeholder values documenting each key
2. **Firebase-style credential files** — if the tool needs JSON credential files, document the expected filenames in the setup tip and README
3. **`setup.sh` credentials tip** — add an entry to the credentials reminder block at the bottom of `setup.sh` describing what to configure
4. **`README.md` Setup section** — add a subsection under `## Setup` for the new tool listing required env vars or credential files with a description table
5. **`npm install` in `setup.sh`** — if the tool has a `package.json`, the install loop already handles it automatically (loops over dirs with package.json)

**Why:** User asked for this pattern after noticing new tools lacked env/credential guidance, making fresh-clone setup unclear.

**How to apply:** At the end of any task that adds or significantly modifies a tool directory, run through this checklist before marking done.
