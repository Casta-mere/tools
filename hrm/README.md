# HRM (`hrm/`)

Fetch HRM-related versions from:

- `feedmepos/portal` package version manifests on branch `ci`
- `feedmepos/gitops-apps` HR backend manifests on branch `main`

## Usage

```bash
node hrmVersion.js
node hrmVersion.js --prod
node hrmVersion.js mf-hrm-portal hrm-permission hrm-actionguard hr-backend
```

By default the script returns:

- `mf-hrm-portal`
- `hrm-permission`
- `hrm-actionguard`
- `hr-backend`

Portal package names may be provided with or without the `@feedmepos/` scope.

## Requirements

- GitHub CLI (`gh`) must be installed and authenticated with access to:
  - `feedmepos/portal`
  - `feedmepos/gitops-apps`
