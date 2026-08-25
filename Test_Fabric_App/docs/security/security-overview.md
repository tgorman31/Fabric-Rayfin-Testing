# Security overview

This is an initial, evidence-based security review of the repository. It is not a certification, audit, threat model or production approval.

## Status legend

- **Implemented** — verified in current application code or tests.
- **Development control** — exists in the development/application flow but is not necessarily the final production control.
- **Platform-provided** — primarily supplied by Fabric/Rayfin rather than this repository.
- **Known limitation** — remediation or formal acceptance is needed.
- **To verify** — repository evidence is insufficient for a reliable claim.

## Responsibility boundaries

- **Application code:** route guards, role lookups, service checks, input/domain validation, data mapping, audit fields and safe handling of local configuration.
- **Fabric/Rayfin/platform:** authentication provider integration, API/data boundary, platform permissions, hosting, tenant configuration and operational controls. Specific guarantees are **Platform-provided / To verify** unless documented here by repository evidence.
- **Organisation:** identity lifecycle, role assignment, least privilege, data classification, monitoring, incident response, backups, vulnerability response and production acceptance.

## Authentication

**Implemented:** `src/main.tsx` bootstraps the configured auth service, `AuthProvider` exposes the session, and `AuthGuard` redirects unauthenticated users to `/auth`. Services also check for an authenticated current user before sensitive operations.

**Platform-provided / To verify:** the repository does not establish the provider’s production configuration, MFA/conditional-access policy, session lifetime, account recovery, tenant boundaries or sign-in audit retention.

## Authorisation and access model

### Project Register

**Implemented / Development control:** `src/App.tsx` uses `RegisterAccessGuard`; `projectIndexService.ts` and `src/domain/projectRegisterAccess.ts` check `app_user_role` for the current user. The launcher removes the Project Register card when access is absent, and a direct route request redirects to `/apps`.

**Known limitation:** this is application-level role-table authorisation. The specification and implementation plan identify Entra group access as longer-term direction; it is not current evidence.

### Project Index

**Implemented:** authenticated users can access `/project-index`, and current service code describes all signed-in users as able to use Project Index in v1. There is no tab-level read-only split in the current code.

**Known limitation:** broad signed-in-user edit access is a transitional business decision, not least-privilege evidence. The repository does not prove backend row-level policies for every Project Index write.

### Programme Admin

**Implemented / Development control:** `/admin` is protected by `ProgrammeAdminAccessGuard`; `programmeAdminService.ts` checks an effective `project_index_admin` role in `app_user_role` before normal Admin operations. Local development can use `VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL` and a signed-in matching user to bootstrap a role.

**Known limitation:** the bootstrap is explicitly development-only, but operational production role provisioning and the platform enforcement boundary are not established here. The service contains a security TODO: programme configuration entities remain broadly authenticated at the Rayfin data-permission layer until a trusted claim/role-backed policy path is confirmed.

## UI visibility versus service/data authorisation

Hiding a launcher card is not sufficient access control. The current code has route guards and service assertions for the Register/Admin paths, which is a **Development control**. However, the repository does not prove that every Rayfin entity operation is denied at the backend for every unauthorised caller.

**To verify:** production Rayfin data policies, entity-level permissions, row-level restrictions, whether direct API calls are rejected, and the trusted identity claim used by any future `@role` policy.

## User and audit metadata

**Implemented:** entity definitions and service writes include fields such as `created_at`, `created_by_user_id`, `created_by_user_email`, `updated_at`, `updated_by_user_id` and `updated_by_user_email`. The launcher and Admin page display the signed-in email in the current UI.

**Known limitation / To verify:** this is update metadata, not a complete immutable audit trail. Retention, tamper resistance, access to audit records, clock source, export and review processes are not established.

## Historical projects and read-only behaviour

**Implemented:** active projects are identified from the current effective date convention. Target Programme writes require an active project; historical projects are represented in Project Index history and are not writable through that Target service path.

**To verify:** consistent read-only enforcement for every Project Index field and entity, and whether historical data can be altered through direct service/API paths outside the tested flows.

## Data handled and storage boundary

The application handles project references, project/site lineage, project names and descriptions, statuses, programme dates, team/member information, administrative programme metadata and audit identifiers. Some team entries can be free text and are marked unverified by the application model.

**Implemented:** the browser uses a typed Rayfin client configured with a base URL and publishable key; data access is routed through Rayfin services and entities in `rayfin/data/`.

**Platform-provided / To verify:** encryption in transit/at rest, tenant isolation, storage-region rules, retention, deletion, classification, export controls and Rayfin/Fabric administrative access.

## Browser and client risks

The UI is a browser application. It should be treated as an untrusted client: users can inspect or replay requests, and UI restrictions can be bypassed. Do not put secrets in frontend code or `.env.local`; `.gitignore` ignores local environment files and Rayfin environment/deployment files.

**Implemented:** no credentials, tokens or personal examples were added to this documentation. The client uses a publishable key and enabled auth storage.

**To verify:** production browser security headers, content-security policy, HTTPS enforcement, token storage/session protection, XSS protections, map-provider privacy, and whether sensitive fields are minimised in responses.

## Environment and secrets

**Development control:** `.env.local`, `*.local`, `rayfin/.env*` and Rayfin deployment files are ignored by Git. The README instructs maintainers not to commit `.env.local`.

**Known limitation / To verify:** ignore rules do not prevent accidental disclosure outside Git, and the repository does not document a production secret store, rotation process, scanning, or the exact treatment of all build-time variables. Publishable values are not automatically harmless; verify their scope and backend policies.

## Dependencies and supply chain

The dependency set is visible in `package.json` and locked by the repository’s lockfile. Tests use Vitest and linting uses ESLint. The frontend includes Rayfin packages, React, React Router, Leaflet and Tailwind.

**Development control:** dependency versions are declared and a lockfile exists.

**To verify:** automated dependency update policy, vulnerability scanning, licence review, provenance/signature checks, remediation SLAs, npm registry controls and review of transitive dependencies.

## External and network services

**Implemented:** the app calls Rayfin through the configured client. The Project Index map uses Leaflet and a tile layer.

**To verify:** exact production tile host, TLS and CSP allow-list, provider terms/privacy, whether project-derived map coordinates are sent externally, outbound network restrictions, rate limits and failure handling.

## Logging, monitoring and operations

The repository contains save/error UI states and error handling, but that is not security monitoring.

**To verify:** central application/security logs, authentication and authorisation event logging, alerting, log redaction, retention, access review, incident response integration, uptime monitoring and operational ownership.

## Backup and recovery

**To verify:** Rayfin/Fabric backup schedule, point-in-time recovery, restore testing, retention, recovery time/objectives, disaster recovery ownership and data-loss handling. No backup or recovery procedure is established by this repository.

## Vulnerability and dependency management

**Development control:** tests and lint scripts are available; source-level security TODOs are visible in `programmeAdminService.ts`.

**To verify:** security testing schedule, static analysis, dependency vulnerability alerts, patch ownership, penetration testing, disclosure handling and evidence that failed checks block release.

## Known limitations and production-readiness gaps

1. Programme configuration data permissions are acknowledged in code as broadly authenticated pending a trusted role-backed Rayfin policy.
2. Project Index editing is intentionally broad for v1; a tab-level least-privilege model is not implemented.
3. Entra group-based authorisation is planned, not evidenced as current.
4. UI visibility and route/service checks do not by themselves prove backend/entity enforcement.
5. Audit columns exist, but a complete immutable audit trail and review process are not evidenced.
6. Monitoring, backup/recovery, incident response, security logging and operational ownership are not documented as established.
7. Browser security headers, CSP, token/session hardening and map-provider controls are not evidenced.
8. Tenure, full Construction delivery and Board Report are incomplete/future areas; their final data/access risks still require review.

## Security evidence map

| Topic | Evidence | Status |
|---|---|---|
| Authentication and route gating | `src/main.tsx`, `src/App.tsx`, `src/hooks/AuthContext.tsx` | Implemented; platform details To verify |
| Register access | `src/domain/projectRegisterAccess.ts`, `src/hooks/useProjectRegisterAccess.ts`, `src/services/projectIndexService.ts` | Development control |
| Programme Admin access | `src/services/programmeAdminService.ts`, `src/domain/programmeAdminRules.ts` | Development control; limitation noted |
| Development bootstrap | `src/domain/programmeAdminAuth.ts`, `programmeAdminService.ts`, `.gitignore` | Development control; not production provisioning |
| Data/entity boundary | `src/services/rayfinClient.ts`, `rayfin/data/schema.ts` | Implemented client boundary; platform controls To verify |
| Audit metadata | `rayfin/data/` entities and service field selections | Implemented fields; full audit process To verify |
| Programme validation | `src/domain/programmeRules.ts`, `src/domain/targetProgramme.ts`, tests | Implemented application rules |
| Requirements and planned controls | [`SPEC.md`](../../SPEC.md), [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md), [`SPEC-QUESTIONNAIRE.md`](../../SPEC-QUESTIONNAIRE.md) | Canonical direction, not proof of deployment |

## Production-readiness statement

This document does not approve the application for production. Production acceptance requires organisational security and IT review, confirmation of platform controls, least-privilege data authorisation, secret and identity configuration, operational monitoring, backup/recovery, vulnerability management, data handling decisions and formal acceptance or remediation of every outstanding limitation.

Read the [architecture overview](../architecture/architecture-overview.md) for system boundaries and [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md) for planned engineering direction.

## Material items marked `To verify`

- Production authentication configuration, MFA/conditional access, session policy and tenant boundaries.
- Rayfin entity/data permissions, row-level restrictions, direct API rejection and trusted role claims.
- Complete historical-project read-only enforcement.
- Audit retention, tamper resistance, review, export and clock controls.
- Encryption, storage region, retention, deletion, classification and platform administrative access.
- CSP, security headers, HTTPS, token storage/session protection and response minimisation.
- Production secret storage, rotation and scanning.
- Dependency scanning, licence/provenance review and remediation process.
- Map tile provider, privacy, CSP/network allow-list and external coordinate handling.
- Central logging, monitoring, alerting, retention, incident response and ownership.
- Backup, restore testing, disaster recovery and recovery objectives.
- Security testing, penetration testing, patching and release gates.
