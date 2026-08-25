# Threat model

## Purpose and scope

This is an evidence-based threat model for the current Fabric Rayfin Project Index application. It identifies assets, trust boundaries, threat or failure scenarios, and evidence still needed. It is not a penetration test, certification, security accreditation, or production approval. A scenario in this document is not a claim that an exploit or vulnerability exists.

The model describes the current repository. Planned work, open issues and platform assumptions are labelled as such. See the [data flows and trust boundaries](../architecture/data-flows-and-trust-boundaries.md) document for flow-level detail and the [production-readiness register](production-readiness-register.md) for evidence and decisions that remain open.

## Method and assumptions

The browser is an untrusted client: a user can inspect the UI and replay or alter client requests. Route guards, hidden controls and disabled inputs therefore describe the normal application flow, not a complete backend authorisation boundary. The model follows data and authority from the user through React pages, services and domain rules to the Rayfin client/API and Fabric/Rayfin entities.

The threat and failure sources below are categories for review, not claims about the capabilities or intent of any particular person:

- unauthenticated caller;
- authenticated ordinary user;
- authenticated privileged user;
- compromised browser or session;
- developer, build or repository compromise;
- dependency or supply-chain compromise;
- accidental administrator or maintainer error; and
- platform or control misconfiguration.

## Assets and security objectives

| Asset or objective | Why it matters in this application |
|---|---|
| Project Register and project/site integrity | Master project and site records establish project identity and lineage. |
| Project Index data integrity | Project information, summaries, teams and related records must not be changed outside the intended authority. |
| Programme-date integrity | Baseline, target and reporting dates drive programme views and must remain consistent with canonical records. |
| Programme-configuration integrity | Definitions, summaries, dependencies and Reporting-to-Target mappings affect every project using them. |
| Role and authorisation integrity | `app_user_role` results influence launcher, route and service decisions. |
| Team/member and audit-metadata confidentiality | Project and user-related information is returned to the browser and includes mutation metadata. |
| Authentication and session material | Auth state and tokens enable access to the application and its data boundary. |
| Configuration and build values | Vite/Rayfin values select the backend and authentication path and are browser-visible. |
| Application, source and dependency integrity | Source and packages determine validation, access checks and data handling. |
| Availability and recovery | Users need reliable access and the organisation needs a recoverable source of project data. |
| Auditability and accountability | The organisation may need to establish what changed, when, and by which identity. |

No organisational data classification is assigned here.

## Threat scenario register

The related readiness IDs point to the existing [production-readiness register](production-readiness-register.md). They identify follow-up evidence; they do not imply that the item is resolved.

| ID | Threat/failure scenario | Asset/security objective | Entry point/trust boundary | Current evidence/control | Residual gap/uncertainty | Required mitigation/evidence/decision | Related readiness IDs |
|---|---|---|---|---|---|---|---|
| TM-01 | A caller bypasses a client-side or route restriction and calls a service/API directly. | Role integrity; project and configuration integrity | Browser to service/API and API to Rayfin data | Auth guards and route guards protect the normal UI flow; services perform some authenticated-user checks. | UI visibility and route checks do not prove direct-request or entity-policy denial. | Verify service coverage, trusted identity claims and Rayfin policies; apply or formally decide the final enforcement boundary. | ID-04, ID-05, ID-06 |
| TM-02 | A signed-in caller reaches a Project Register write path without the normal Register role-gated UI. | Project Register integrity; authorisation integrity | `app_user_role` lookup to `projectService.ts` and master entities | Launcher and route access use `app_user_role`; current writes authenticate the user. | Write functions do not independently assert the Register role and master project/site entities are broadly authenticated. This is a known enforcement-boundary limitation, not a proven exploit. | Implement or formally accept role enforcement in the write service/entity boundary and verify direct requests. | ID-04 |
| TM-03 | Programme Admin service checks and the Rayfin entity policy do not express the same authority. | Programme-configuration integrity | Admin UI/service to `app_user_role` and programme entities | `programmeAdminService.ts` independently asserts the effective `project_index_admin` role before normal operations. | Entity/data-layer hardening and trusted claim behaviour remain a code/platform question. | Confirm and test a trusted role-backed entity policy and production role provisioning. | ID-05 |
| TM-04 | Broad signed-in Project Index editing changes data outside a future least-privilege model. | Project Index integrity; privacy | Authenticated user to Project Index services/entities | Broad signed-in editing is current v1 behaviour and is documented as such. | It is not least-privilege evidence; complete row/entity policy coverage is not established. | Agree roles and lifecycle, then verify backend/data enforcement before narrowing or expanding scope. | ID-06, ID-07 |
| TM-05 | A manipulated project GUID or direct client request targets a different project or record. | Project identity and data integrity | Browser request to Project Index service/API | Project workspaces are selected by `project_guid`; services use explicit queries and domain mappings. | The repository does not prove that every direct request is authorised for the selected project or that GUID manipulation is rejected by the backend. | Test project-bound access for each write/read path and verify platform/entity restrictions. | ID-06, ID-09 |
| TM-06 | A write path changes a historical project that should be read-only. | Historical data integrity | Project Index services to project/programme entities | Target Programme service paths enforce active-project checks; historical Target behaviour has implementation/tests. | This does not prove consistent read-only enforcement for Project Information, teams, Reporting, Admin-adjacent or direct API/data paths. | Enumerate restrictions, verify paths and data enforcement, retain tests and decide any exceptions. | ID-33 |
| TM-07 | A compromised browser, session or token is used to inspect or replay requests. | Auth/session material; all accessible data | User device/browser to client/API boundary | The app has configured auth storage and requires an authenticated user for relevant service operations. | Session policy, storage protection, MFA, device controls, revocation and platform monitoring are not evidenced. | Confirm identity/session controls and investigate/revoke through the approved operational process. | ID-01, ID-02, ID-03, ID-14 |
| TM-08 | Unsafe HTML handling could expose users to script execution through stored or rendered data. | Browser session and data confidentiality | Data returned from Rayfin to React rendering | No `dangerouslySetInnerHTML` or direct HTML insertion was found in the inspected application source. | This limited search is not a complete XSS assessment and does not prove all current or future inputs are safe. | Complete an application security review and retain the finding/evidence; keep CSP and output handling open. | ID-13, ID-14 |
| TM-09 | Responses expose more project, team/member or audit data than a function requires. | Confidentiality and least-data handling | Rayfin API/data boundary to browser | Several services use explicit `select(...)` field lists. | No formal data-minimisation/privacy review is evidenced; selected fields and related entities still need review. | Review browser/API responses, personal/team/audit metadata and fields unsuitable for ordinary clients. | ID-08, ID-09, ID-10, ID-35 |
| TM-10 | Programme definitions, summary memberships, dependencies or mappings are tampered with. | Programme-configuration and programme-date integrity | Admin service/domain layer to canonical programme entities | Admin service role assertion and domain validation cover identity, relationships, cycles and mappings in normal operations. | Entity-level enforcement, privileged access and complete auditability remain open. | Verify backend policies, role lifecycle, change review and audit evidence. | ID-05, ID-10, ID-34 |
| TM-11 | Optimistic writes or stale asynchronous completions leave the displayed programme inconsistent. | Programme-date integrity; accountability | React working copy to queued service writes and back to the current project | Canonical local state is patched immediately; same-key writes are sequenced; different keys can proceed; revision/project guards prevent stale completions; failures reconcile after queued writes settle. | This is not a database transaction, realtime collaboration or offline guarantee; backend concurrency/durability remain to verify. | Test failure and concurrency behaviour against the required data semantics and define recovery expectations. | ID-17, ID-20, ID-25 |
| TM-12 | Mutation metadata is mistaken for an immutable audit trail. | Auditability and accountability | Service/entity writes to stored metadata | Relevant records include created/updated timestamps and user identifiers/emails. | Events, retention, immutability, access, review, export, clock source and auth-event coverage are not defined. | Define and evidence the production audit trail and its ownership. | ID-17, ID-18, ID-34 |
| TM-13 | Configuration or a browser-visible value discloses a secret or is given excessive scope. | Auth/configuration integrity | Local/generated environment to Vite bundle/browser | Ignore rules cover local and generated Rayfin files; Vite values are understood as browser-visible configuration. | Production storage, scope, rotation, scanning and the treatment of `VITE_RAYFIN_PUBLISHABLE_KEY` are not evidenced. | Confirm value scope and approved configuration/rotation/scanning process; never place secrets in frontend configuration. | ID-11, ID-12 |
| TM-14 | A compromised or unreviewed dependency changes application behaviour or exposes data. | Source/dependency integrity; confidentiality | Repository/lockfile/build to browser | Dependencies are declared and locked; tests and lint scripts exist. | Scanning, provenance, licence review, update ownership and remediation process are not evidenced. | Establish dependency review and vulnerability-management evidence. | ID-21, ID-22 |
| TM-15 | OpenStreetMap requests disclose network metadata or fail, are rate-limited, or are not approved for production. | Privacy; availability; browser/network policy | Browser to `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | Leaflet/react-leaflet currently uses the known hardcoded endpoint. | Approval, terms/privacy, whether coordinates are sent, CSP/network allow-list, rate/failure handling and continued use are open. | Obtain organisational/platform approval and define network, privacy and fallback expectations. | ID-15, ID-16 |
| TM-16 | Security-relevant events are not logged, monitored or retained sufficiently to investigate. | Detection; accountability; availability | Application/platform operations boundary | UI save/error states and application error handling exist. | Central auth/authorisation/security logging, redaction, alerting, retention and ownership are not evidenced. | Define events, monitoring, access and escalation evidence. | ID-17, ID-18, ID-28 |
| TM-17 | Backup, restore or disaster recovery is insufficient after data loss or service failure. | Availability; recovery; data integrity | Fabric/Rayfin storage and operational boundary | No repository backup or restore procedure is established. | Backup schedule, retention, restore testing, RPO/RTO and recovery ownership are unknown. | Obtain platform evidence, test restore and make recovery decisions before rollout. | ID-19, ID-20 |
| TM-18 | An uncontrolled deployment or rollback leaves application, data and schema versions inconsistent. | Application/source integrity; availability; data integrity | Repository/build/deployment and data/schema boundary | Git identifies source changes and the repository documents development commands. | No complete production promotion, approval, deployment or data/schema rollback procedure is established; no CI/CD should be inferred. | Define release evidence and tested rollback/recovery; do not improvise production data or schema reversal. | ID-23, ID-24, ID-25 |

## Control summary

### Implemented or evidenced in the application

- Authentication/bootstrap selects a local mock path for localhost and a Rayfin path for non-local configuration.
- Normal authenticated routing and application access guards exist.
- Programme Admin has an independent service-level role assertion.
- Programme domain validation covers canonical identity and relationship rules, including dependency and mapping checks.
- Explicit field selection is used in a number of queries.
- Project-level optimistic programme state uses keyed writes, project/revision guards and reconciliation after failures.
- The repository has a lockfile, tests and lint scripts.

### Development or transitional controls

- Project Register launcher/route access is role-gated, but its write service has no equivalent independent role assertion.
- Broad signed-in Project Index editing is current v1 behaviour.
- Local Admin bootstrap is development-only.
- Ignore rules reduce the chance of committing local configuration but do not provide a secret store or scanning process.

### Platform controls to verify

Production identity configuration, tenant and entity policies, transport/storage protection, browser headers/CSP/HTTPS, session policy, platform administrative access, central logs, monitoring, backups, restore capability and external network controls are not established by this repository.

### Organisational decisions required

The organisation must decide data handling and least privilege, role ownership and lifecycle, external map-provider use, audit requirements, support/incident ownership, recovery objectives, vulnerability-management expectations, security testing and production acceptance. The [production-readiness register](production-readiness-register.md) is the evidence-tracking mechanism.

## Known limitations

This model is based on inspected source, tests and canonical documentation; it is not exhaustive. It does not prove that an issue is exploitable, that a platform policy is absent, or that a production deployment matches this repository. It does not establish a data classification, immutable audit trail, complete historical-project read-only boundary, database transaction semantics, realtime collaboration, offline support or an approved production architecture.

The model should be revised when authentication or role enforcement changes, new Project Index write paths are added, Rayfin entity policies change, external services change, deployment is established, or future areas such as Tenure, Construction or Board Report enter scope.

## Lightweight STRIDE aid

If useful in a review workshop, the scenarios can be discussed using **Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service and Elevation of Privilege**. This is an organising aid only; using these labels does not prove that the review is complete.

## Related evidence

- [Data flows and trust boundaries](../architecture/data-flows-and-trust-boundaries.md)
- [Security overview](security-overview.md)
- [Production-readiness register](production-readiness-register.md)
- [Architecture overview](../architecture/architecture-overview.md)
- [`SPEC.md`](../../SPEC.md)
- [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)
- [`SPEC-QUESTIONNAIRE.md`](../../SPEC-QUESTIONNAIRE.md)
- [ADR index](../decisions/README.md)

The current source and tests referenced by the flow and security documents remain the implementation evidence. GitHub issues and pull requests can establish an accepted direction or delivery history, but an issue alone is not proof that functionality is implemented.
