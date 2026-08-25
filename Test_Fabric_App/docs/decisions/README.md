# Architecture Decision Records

An **Architecture Decision Record (ADR)** is a short, version-controlled record of why a material technical structure or boundary was chosen. ADRs help future maintainers preserve an intentional architecture when implementation work expands.

## What ADRs are — and are not

ADRs explain the reasoning, constraints and consequences of an architecture choice. They do not replace the other project sources of truth:

- **SPEC** = what the product must do
- **Questionnaire** = agreed and open business/product decisions
- **Implementation Plan** = engineering roadmap and sequencing
- **ADR** = why a material architecture choice was made
- **Architecture Overview** = how the application currently fits together

An ADR is not a detailed tutorial, data dictionary, implementation plan, security approval or statement that all described work has shipped.

## Status meanings

- **Accepted** — the decision is accepted and the repository evidence is consistent with it.
- **Accepted, partially implemented** — the architectural direction is accepted, but only part of the implementation is present on current `main`.

A status describes the decision record, not production readiness.

## Current decisions

| ADR | Status | Decision |
|---|---|---|
| [ADR-001: Single Fabric Rayfin application](ADR-001-single-fabric-rayfin-app.md) | Accepted | Keep the functional areas inside one Fabric Rayfin application with route-level separation. |
| [ADR-002: Canonical programme model](ADR-002-canonical-programme-model.md) | Accepted | Use shared definitions and project programme records as one canonical programme architecture. |
| [ADR-003: Target stage detail model](ADR-003-target-stage-detail-model.md) | Accepted, partially implemented | Keep common stage status separate from strongly typed stage-specific Target detail entities. |
| [ADR-004: Project programme working copy](ADR-004-project-programme-working-copy.md) | Accepted | Load and update one project-level programme working copy with optimistic, queued persistence. |

## Adding or changing an ADR

Add a new ADR when a material architecture choice is made that future implementation should preserve. Use the same structure as the existing records and link to current source, canonical documents, tests and verified GitHub history where they support the claim.

Accepted ADRs form append-only decision history. Do not silently rewrite an old accepted decision when architecture changes. A changed decision should normally create a new ADR that supersedes or revises the older record while retaining the earlier explanation and references.

Keep current implementation separate from accepted-but-not-yet-implemented continuation. Do not use an issue as proof that functionality has shipped: an issue can show accepted design direction, while merged source and tests are evidence of implementation.

## Related documentation

- [Documentation index](../index.md)
- [Architecture overview](../architecture/architecture-overview.md)
- [Security overview](../security/security-overview.md)
- [`SPEC.md`](../../SPEC.md)
- [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)
- [`SPEC-QUESTIONNAIRE.md`](../../SPEC-QUESTIONNAIRE.md)
