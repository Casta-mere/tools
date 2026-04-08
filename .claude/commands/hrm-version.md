---
allowed-tools: Bash(node:*)
description: Look up HRM frontend and backend versions from portal and gitops for both dev and prod
---

## Your task

The user invoked `/hrm-version` with the following arguments: $ARGUMENTS

Use `{{REPO_ROOT}}/portal/hrmVersion.js` to fetch HRM versions.

### Execute directory

Run commands from `{{REPO_ROOT}}/portal`.

### Command

```bash
node {{REPO_ROOT}}/portal/hrmVersion.js [mf-hrm-portal hrm-permission hrm-actionguard hr-backend]
node {{REPO_ROOT}}/portal/hrmVersion.js --prod [mf-hrm-portal hrm-permission hrm-actionguard hr-backend]
```

### Behavior

1. If `$ARGUMENTS` is empty, run both commands with no extra target arguments to return the default HRM set for dev and prod.
2. If `$ARGUMENTS` includes one or more target names, pass the same target list to both commands.
3. Ignore `prod` and `--prod` in `$ARGUMENTS` because this command should always fetch both environments.
4. After running both commands, present the result as a single table with columns: target, dev version, prod version.
5. Do not show the source column unless the user explicitly asks for it.

### Notes

- Supported targets: `mf-hrm-portal`, `hrm-permission`, `hrm-actionguard`, `hr-backend`
- Portal package names may also be passed with the `@feedmepos/` scope.
- Data sources:
  - `feedmepos/portal` branch `ci`
  - `feedmepos/gitops-apps` branch `main`
