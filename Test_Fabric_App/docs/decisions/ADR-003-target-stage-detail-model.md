# ADR-003: Target stage detail model

Status: Accepted, partially implemented

## Context

Target Programme stages contain two different kinds of information. Each stage has common status information such as RAG and RAG Comment, while some stages also have business attributes that are specific to that stage. Programme dates have their own canonical model and should not be mixed with stage-specific attributes.

The current repository contains DDTC-specific detail and common stage-status entities. Current tests also make the implementation boundary explicit: DDTC is the implemented Target stage, while Planning is not implemented on current `main`.

Planning Issue #14 and its open PR #30 describe an accepted continuation of this pattern using a strongly typed Planning detail entity. That is accepted direction, not current implementation until merged.

## Decision

Use the following Target-stage detail pattern:

- Common stage `RAG` and `RAG Comment` belong in reusable `project_target_stage_status`, keyed by `project_guid` and `stage_code`.
- Stage-specific business attributes belong in a strongly typed stage-specific detail entity, such as the current `project_target_ddtc_detail`.
- Programme dates remain in `project_programme`, identified by the canonical programme definition.
- Do not create one generic nullable mega-table containing every stage’s optional business attributes.

This preserves a clear boundary: programme rows and dates are handled by the canonical programme model, common stage status is shared, and stage-specific facts have typed ownership.

## Consequences

### Benefits

- Common RAG/status behaviour can be reused across stages without duplicating status entities.
- Stage-specific validation and fields remain explicit and strongly typed.
- Programme date rules remain separate from stage business attributes.
- A stage can be added without forcing every other stage’s optional fields into the same table.

### Trade-offs / constraints

- Each stage-specific attribute set requires its own entity, service handling and tests.
- The working-copy state must carry common status and any implemented stage detail together.
- A stage-specific entity does not imply that the stage’s full row catalogue or UI is implemented.
- This record does not define entities for Land Activation, Site Pipeline or Construction.

## Guardrails

- Store common stage RAG/RAG Comment in `project_target_stage_status` with the exact stage code.
- Keep stage-specific attributes out of `project_programme` and out of DDTC detail entities belonging to another stage.
- Keep programme dates, summaries, dependencies and references governed by the canonical programme model.
- Add a strongly typed detail entity only when the stage’s attributes and persistence boundary are sufficiently agreed; do not pre-create a speculative all-stage table.
- Treat Planning implementation described by Issue #14/PR #30 as planned continuation until it is merged and verified on `main`.
- Do not encode the current Programme Admin screen layout as part of this architecture decision; Issue #21 remains a UX refinement.

## When to revisit

Revisit this decision if common stage status no longer has shared semantics, if a stage’s attributes require a materially different persistence boundary, or if platform constraints make the typed-entity pattern unsuitable. Revisit the specific stage detail design when its business attributes are formally changed; do not generalise that change into a mega-table without a new decision.

## Evidence and references

- `rayfin/data/project_target_stage_status.ts`
- `rayfin/data/project_target_ddtc_detail.ts`
- `rayfin/data/project_programme.ts`
- `src/services/targetProgrammeService.ts`
- `src/components/programme/TargetProgrammePanel.tsx`
- `src/components/programme/TargetProgrammeStageWorkspace.tsx`
- `src/__tests__/projectProgrammeWorkspace.test.ts`
- `src/__tests__/targetProgramme.test.ts`
- [Merged PR #26: DDTC Target Programme workspace](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/26)
- [Open Issue #14: Planning Target Programme](https://github.com/tgorman31/Fabric-Rayfin-Testing/issues/14)
- [Open PR #30: Planning Target Programme](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/30)
- [Open Issue #21: Programme Admin usability refinement](https://github.com/tgorman31/Fabric-Rayfin-Testing/issues/21)
- [Architecture overview](../architecture/architecture-overview.md)
