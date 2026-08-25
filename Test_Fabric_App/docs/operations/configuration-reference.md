# Configuration reference

This guide answers: “What setting controls this, where does it come from, and what is safe to change?” It documents current repository evidence, not an approved production configuration.

## Configuration layers

| Layer | Meaning | Evidence or boundary |
|---|---|---|
| Repository configuration | Committed app metadata and scripts | `package.json`, `manifest.json`, `rayfin/rayfin.yml` |
| Generated/local Rayfin configuration | Files and values produced by Rayfin tooling for a local or deployment target | `predev` and `prebuild` run `rayfin env --framework vite`; generated/secret-bearing Rayfin files are ignored |
| Vite/browser-facing configuration | `VITE_*` values read by `import.meta.env` and bundled for the browser | `src/services/bootstrap.ts`; do not treat this as a secret store |
| Development-only configuration | Values used only for local development conveniences | `VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL` and the localhost mock-auth path |
| Organisational/platform configuration | Fabric, Rayfin, identity, tenant, network, permissions and operational settings outside this repository | Not established by committed source; see the [production-readiness register](../security/production-readiness-register.md) |

A browser can inspect bundled Vite configuration. Do not put passwords, tokens or secret-bearing environment values in frontend configuration. A value named “publishable key” is described below by its current purpose and handling, not assumed to be harmless or secret.

## Environment variables evidenced by current code

The application reads these values in `src/services/bootstrap.ts`. Examples are placeholders only.

| Variable | Purpose | Required when | Current code/evidence | Sensitivity/handling | Placeholder example |
|---|---|---|---|---|---|
| `VITE_RAYFIN_API_URL` | Rayfin API base URL; determines whether the backend is treated as local | Optional; defaults to `http://localhost:5168` | `bootstrap.ts` lines 23–24; `rayfinClient.ts` | Browser-visible configuration. Verify the target and access policy before use | `VITE_RAYFIN_API_URL=https://<rayfin-api-host>` |
| `VITE_RAYFIN_PUBLISHABLE_KEY` | Rayfin client publishable key passed to `RayfinClient` | Required when the API URL is not localhost; local mode uses `local-dev-key` when absent | `bootstrap.ts` lines 25–36; `rayfinClient.ts` | Browser-visible. Do not call it a secret, but do not assume its scope or backend permissions are safe; verify them | `VITE_RAYFIN_PUBLISHABLE_KEY=<publishable-key-placeholder>` |
| `VITE_FABRIC_WORKSPACE_ID` | Fabric workspace value passed to the Fabric authentication service | Required when the API URL is not localhost | `bootstrap.ts` lines 43–53; `RayfinAuthService.ts` | Browser-facing configuration. Do not document or commit a real tenant/workspace value here | `VITE_FABRIC_WORKSPACE_ID=<workspace-id-placeholder>` |
| `VITE_FABRIC_ITEM_ID` | Fabric item/project value passed to Fabric authentication | Required when the API URL is not localhost | `bootstrap.ts` lines 43–53; `RayfinAuthService.ts` | Browser-facing configuration. Use a placeholder in examples | `VITE_FABRIC_ITEM_ID=<item-id-placeholder>` |
| `VITE_FABRIC_PORTAL_URL` | Fabric portal URL passed to the Fabric authentication service | Required when the API URL is not localhost | `bootstrap.ts` lines 43–57; `RayfinAuthService.ts` | Browser-facing configuration. Verify approved host and redirect behaviour | `VITE_FABRIC_PORTAL_URL=https://<fabric-portal-host>` |
| `VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL` | Exact signed-in email allowed to use the development Programme Admin bootstrap action | Only for an eligible local/development bootstrap; it is not a production role-provisioning mechanism | `src/pages/AppLauncherPage.tsx`, `src/domain/programmeAdminAuth.ts`, `programmeAdminService.ts` | Personal value; use a local placeholder and never commit the real value | `VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL=<signed-in-user-email>` |

The `manifest.json` also contains placeholder tokens used by Rayfin tooling for generated configuration. It is not a source for real environment values.

## Local development versus Fabric-hosted configuration

`bootstrapAuth()` chooses the auth implementation from the API URL:

- **Local backend:** a hostname of `localhost` or `127.0.0.1` selects `MockAuthService`. The local service uses the bundled development fixture account in `MockAuthService.ts`; this path is for local development only and must never be treated as production authentication.
- **Non-local backend:** `RayfinAuthService` is selected. A publishable key and the three `VITE_FABRIC_*` values are required, and the Fabric brokered authentication SDK is used.

The API URL is normalised with a trailing slash before the Rayfin client is initialised. If required non-local values are missing, startup throws an explanatory configuration error rather than silently selecting local auth.

`rayfin/rayfin.yml` currently enables authentication, data and static hosting, uses `dist` as the static folder, and sets `npm run build:fabric` as the static build command. It also contains local redirect URIs and a committed hosted redirect URI; do not copy environment-specific values into new documentation without checking the intended target.

## Files that must not be committed

Current `.gitignore` rules cover:

- `.env.local` and other `*.local` files
- `rayfin/.env*`, including generated Rayfin environment files
- `rayfin/.deployments.json`
- `rayfin/.temp/`
- dependency, build and local tool output

These rules reduce accidental commits but do not replace careful review. Do not print or attach those files during support work.

## Programme Admin bootstrap

The launcher can show **Bootstrap Admin access** only when the development eligibility checks pass: the app is running in development mode, the configured email matches the signed-in user after normalisation, and the user does not already have the effective admin role. The service creates or reuses a `project_index_admin` role in the local/application data path.

**Current development procedure:** use this only for local development setup with a placeholder-backed local `.env.local`. Do not use it as production access provisioning, do not paste a real email into documentation, and do not bypass the agreed role-management process.

## Configuration troubleshooting

| Symptom | Likely configuration area | Safe first check |
|---|---|---|
| App will not bootstrap | `VITE_RAYFIN_API_URL`, publishable key or generated Rayfin environment | Confirm the intended environment file exists locally, values are non-empty, and no secret-bearing file is being committed or shared |
| Sign-in fails or Fabric config is reported missing | Non-local auth branch and `VITE_FABRIC_*` values | Confirm the API URL is intentionally non-local and each required variable is present; do not expose its value in a ticket |
| Rayfin API is unavailable | API URL, local Rayfin services or platform availability | Confirm the URL/environment, check whether the issue affects one user or all users, and capture the exact error/time |
| Programme Admin bootstrap is unavailable | Development mode, email match or existing role | Confirm local development mode and placeholder configuration; for production access, escalate through the proposed identity/support path |

## Production configuration still to verify

Production storage and rotation of configuration values, approved redirect hosts, API/key scope and data policies, identity/platform settings, network treatment, environment separation and operational ownership remain open readiness questions. See the [production-readiness register](../security/production-readiness-register.md) and [deployment and release guide](deployment-and-release.md).
