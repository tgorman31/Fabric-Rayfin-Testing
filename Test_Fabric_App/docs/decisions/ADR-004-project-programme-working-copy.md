# ADR-004: Project programme working copy

Status: Accepted

## Context

Project Index presents Reporting and Target Programme information together for one selected project. The application needs projections, derived summaries, dependency-effective dates and reporting references to agree while a user edits dates. Independently fetching each stage or letting a component own a separate copy would make those views easier to diverge.

The project workspace implementation loads programme configuration, project programme records and relationships into one `ProjectProgrammeClientState`. Project Index patches that state locally, derives Reporting/Target projections from it, and persists edits through queued service writes.

## Decision

Use one project-level programme working copy for an open Project Index project:

- Opening a project loads one project-level programme client-state bundle.
- Reporting and Target projections derive from that shared working copy.
- Switching between implemented Target stages is an in-memory projection operation, not an independent full workspace fetch.
- An authoritative user edit patches local canonical state immediately.
- Summaries, dependency-effective values and reporting references recalculate from that state.
- Persistence occurs in the background through service writes.
- Writes for the same logical key are sequenced; different logical keys may proceed independently.
- Failed writes surface to the user and trigger safe reconciliation/refetch after queued writes settle.
- Project-scoped guards prevent stale completions from a previously opened project or older write revision from mutating the current project.

Optimistic UI improves responsiveness but is not a database transaction guarantee, offline support or real-time collaboration mechanism.

## Consequences

### Benefits

- Reporting and Target views can reflect the same local source state immediately.
- Derived summaries, dependency propagation and reporting references can update before persistence resolves.
- Logical-key sequencing prevents same-record writes from racing each other while independent records remain independent.
- Project and write revisions reduce the risk that stale asynchronous work overwrites a newly selected project.
- Future Target stages can share one loading, projection, persistence and reconciliation architecture.

### Trade-offs / constraints

- The UI can temporarily show an optimistic value that the backend later rejects; failure state and reconciliation are required.
- Local working state is not a transaction boundary and does not remove the need for service validation or backend policy.
- Queue keys and project/revision guards must remain correct as new write types are added.
- A full reconciliation can be needed after failure, so a user should not be told that a value is durable merely because the local screen changed.
- This decision does not provide realtime collaboration, offline support or distributed transaction semantics.

## Guardrails

- Load programme state through the project workspace rather than adding component-owned per-stage fetching.
- Derive Reporting and Target views from the same `ProjectProgrammeClientState` and canonical programme records.
- Patch local authoritative records immediately, then enqueue persistence with a stable project/logical-record key.
- Sequence same-key writes and allow independent keys to proceed independently.
- Surface failures and reconcile only with project/revision checks that protect the currently open project.
- New Target stages should reuse this project-level working-copy, keyed-write-queue and reconciliation architecture rather than introducing a second state model.
- Keep service/domain validation authoritative; optimistic UI is not authorisation or transaction enforcement.

## When to revisit

Revisit this decision if the application adopts a different consistency model, server-driven collaborative editing, offline-first operation, or a persistence mechanism that provides materially different transaction semantics. A new stage is not by itself a reason to create a separate state architecture.

## Evidence and references

- `src/pages/ProjectIndexPage.tsx`
- `src/services/projectIndexService.ts`
- `src/services/targetProgrammeService.ts`
- `src/services/programmeService.ts`
- `src/domain/keyedWriteQueue.ts`
- `src/components/programme/TargetProgrammePanel.tsx`
- `src/components/programme/TargetProgrammeStageWorkspace.tsx`
- `src/__tests__/projectProgrammeWorkspace.test.ts`
- `src/__tests__/keyedWriteQueue.test.ts`
- [Merged PR #28: project workspace preload and optimistic Target Programme updates](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/28)
- [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)
- [Architecture overview](../architecture/architecture-overview.md)
