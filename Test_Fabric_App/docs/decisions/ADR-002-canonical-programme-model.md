# ADR-002: Canonical programme model

Status: Accepted

## Context

Reporting and Target Programme views use related milestones, activities, summaries, dependencies and reporting references. If each view owned a separate catalogue or connected rows by display labels, definitions could drift and renamed labels could silently break relationships.

The programme foundation separates stable row definitions from project-specific date records. The canonical cutover moved current Reporting Programme persistence from `project_reporting_programme_item` to `programme_item_definition` plus `project_programme`; the legacy entity remains migration/archive storage rather than the model for new Reporting implementation.

## Decision

Use one canonical programme architecture:

- `programme_item_definition` owns centrally maintained row definitions, including stable identity, area, stage, row type, order and edit/derived metadata.
- `project_programme` owns project-specific programme records identified by `project_guid` and `programme_item_definition_guid`.
- Each canonical project programme record can hold baseline, target and reporting date sets. Baseline remains available for downstream comparison but is not exposed as v1 operational UI.
- `programme_summary_member` stores explicit summary membership.
- `programme_dependency_definition` stores explicit dependency relationships.
- `programme_reporting_mapping` stores explicit Reporting-to-Target relationships using stable definition GUIDs and source/target fields.
- Summaries, dependency-effective values and reporting references are derived from the canonical records and relationships rather than being competing manually persisted facts.

Reporting Programme and Target Programme are different views/uses of one canonical programme architecture. They are not independently maintained row catalogues joined by matching display labels.

## Consequences

### Benefits

- Stable GUID/FK identity survives display-label changes and permits differently named Reporting and Target items to map explicitly.
- Programme definitions and relationships can be centrally maintained while project dates remain project-specific.
- Shared domain rules can calculate summaries, dependency propagation and Reporting references consistently.
- Future maintainers have one model to extend rather than separate Reporting and Target persistence paths.

### Trade-offs / constraints

- A project programme record carries several date sets even when a particular view uses only one of them.
- Relationship configuration must be valid: summary membership and dependency cycles, duplicate controllers and invalid mappings need validation.
- Derived values must be recalculated from their sources; manually persisting a competing summary or reference value creates conflicting authority.
- The legacy Reporting-specific entity may remain for migration/archive compatibility, but it must not become the source for new Reporting work.
- This decision does not invent future dependency types, custom-row behaviour, baseline UI or a final production catalogue.

## Guardrails

- Use stable definition GUIDs/foreign keys for programme relationships; do not infer relationships from row labels.
- Put canonical row metadata in `programme_item_definition` and project date values in `project_programme`.
- Keep summary, dependency and Reporting mapping relationships explicit and validated.
- Keep summaries, dependency-effective dates and reporting references derived/read-only in operational views.
- New Reporting implementation must use `programme_item_definition` plus `project_programme`, not `project_reporting_programme_item`.
- Treat centrally configured programme metadata as configuration; do not hard-code a production catalogue in a page component.

## When to revisit

Revisit this decision if the business requires a genuinely different programme data lifecycle, a new authoritative date model, or a source-of-truth boundary that cannot be represented by canonical definitions, project programme records and explicit relationships. A new dependency type or custom-row requirement should be assessed against this model rather than assumed to change it.

## Evidence and references

- `rayfin/data/programme_item_definition.ts`
- `rayfin/data/project_programme.ts`
- `rayfin/data/programme_summary_member.ts`
- `rayfin/data/programme_dependency_definition.ts`
- `rayfin/data/programme_reporting_mapping.ts`
- `rayfin/data/project_reporting_programme_item.ts` (retained legacy/compatibility entity)
- `src/services/programmeService.ts`
- `src/domain/programmeRules.ts`
- `src/services/targetProgrammeService.ts`
- [Merged PR #10: programme foundation](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/10)
- [Merged PR #11: programme rules, summaries, dependencies and mappings](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/11)
- [Merged PR #22: canonical Reporting Programme cutover](https://github.com/tgorman31/Fabric-Rayfin-Testing/pull/22)
- [`SPEC.md`](../../SPEC.md)
- [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)
- [Architecture overview](../architecture/architecture-overview.md)
