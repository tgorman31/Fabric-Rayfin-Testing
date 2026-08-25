# Deployment and release

## Scope and warning

This is a technical/development release guide based on the current repository. It is **not** an approved organisational production standard operating procedure. The repository does not establish production approvers, promotion environments, deployment automation, support ownership or rollback guarantees.

## Available repository commands

The commands below come from the current `package.json`.

| Command | What it currently does |
|---|---|
| `npm run dev` | Runs `predev`, which calls `rayfin env --framework vite`, then runs `rayfin up --exclude-services staticHosting && vite` for local development |
| `npm run build` | Runs `prebuild` to generate Vite environment configuration, then `tsc -b && vite build` |
| `npm run build:fabric` | Runs the same `tsc -b && vite build` build used by the current Fabric static-hosting configuration |
| `npm run lint` | Runs ESLint over the repository |
| `npm run test` | Runs the Vitest test suite once |
| `npm run rayfin:up` | Runs `rayfin up` |

`rayfin/rayfin.yml` currently identifies `dist` as the static-hosting folder and `npm run build:fabric` as its build command. It enables authentication and data services and disables storage and functions. This describes committed tooling, not a complete production topology or approval process.

## Safe pre-change and pre-release checks

This is a recommended technical checklist, not an approved organisational gate:

1. Record the exact branch and commit SHA being tested.
2. Confirm the working tree is clean or document intentional local changes.
3. Review the changed-file list and confirm no local environment or generated secret-bearing files are staged.
4. Run the relevant focused tests, `npm run lint` and `npm run build` where available.
5. Review the issue/PR and canonical requirements for scope and known limitations.
6. If schema/data changes are involved, follow the issue-specific Rayfin instructions and obtain the required review; do not improvise a deployment or schema rollback.
7. Record whether the change affects runtime code, schema/entities, configuration, or documentation.

No GitHub Actions workflow or CI gate is present in the inspected repository, so none is documented as an existing requirement.

## Current development deployment flow

For local development, `npm run dev` first asks Rayfin tooling to generate the Vite environment, brings up Rayfin services except static hosting, and starts Vite. `npm run rayfin:up` invokes the Rayfin CLI’s up command. A build for static hosting is produced by `npm run build:fabric` according to the committed Rayfin configuration.

**Current implementation:** these commands are the repository’s available technical paths. **To verify:** how a hosted Fabric environment is selected, how promotion occurs, who approves it, and how production configuration is supplied.

## Release evidence to record

The following is a recommended evidence template, not an established company policy:

- commit SHA
- branch and PR number
- checks performed and their results
- whether schema/entity changes are included
- deployment target/environment identifier, without secrets or tenant-sensitive values
- date/time and timezone
- operator or automation identity, if organisationally appropriate
- known limitations and outstanding readiness items
- observed post-release checks and any rollback/escalation decision

## Rollback boundaries

Git can identify a previous source commit and can support a reviewed source revert. That does not prove that a deployed static application, Rayfin configuration, database schema or data can be rolled back safely as one operation.

**Known limitation:** this repository does not establish a complete deployed application/data/schema rollback procedure. **To verify:** data and schema recovery, migration reversal, deployment target rollback, backups and restore testing. Do not manually reverse production rows or schema changes as a diagnostic shortcut; use a controlled, reviewed procedure when one is agreed.

## Environment separation and approvals

**To verify / Organisational decision required:** development, test and production environment boundaries; configuration stores; redirect URI approval; deployment promotion; release approvers; change records; access to deploy; and post-release monitoring. No CI/CD workflow or approved production SOP is evidenced in this repository.

## Failed deployment first checks

1. Capture the exact command, commit SHA, environment/target identifier and timestamp.
2. Separate build failure from Rayfin/service failure and from hosted application failure.
3. Check the changed files and build output without sharing secrets.
4. Confirm required configuration is present in the target through the approved process; do not paste its values into tickets.
5. Compare with the last known good source/build if available.
6. Stop rather than repeatedly redeploying if the target or data/schema effect is unclear.

Use the [troubleshooting guide](troubleshooting.md) and [support/escalation guide](support-and-escalation.md). Track unresolved deployment and recovery questions in the [production-readiness register](../security/production-readiness-register.md).
