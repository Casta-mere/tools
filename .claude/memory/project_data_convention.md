---
name: data/ output directory convention
description: All generated data files (JSON backups, reports, query dumps) go in data/<tool>/, which is gitignored
type: project
---

All output files produced by scripts belong in `data/` at the repo root — never next to the scripts themselves.

Structure mirrors tool dirs:
- `data/mongo/` — MongoDB backups, query dumps, duplicate reports
- `data/firebase/` — Firebase exports

The entire `data/` directory is gitignored via a single rule. Scripts that accept an `--out` flag should be invoked with a path under `data/<tool>/`, e.g. `--out data/mongo/backup-<phone>.json`.

**Why:** Avoids data files accumulating next to source files and accidentally getting committed; single gitignore rule is cleaner than per-file patterns.

**How to apply:** When running scripts that produce output files, always write to `data/<tool>/`. When helping the user invoke backup-user.js, find-duplicates.js, generate-duplicates-report.js, or similar, suggest paths under `data/mongo/` (or appropriate subdir).
