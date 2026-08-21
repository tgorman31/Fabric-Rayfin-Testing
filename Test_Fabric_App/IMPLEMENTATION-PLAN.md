# Project Register / Project Index Implementation Plan

## Purpose

This document translates `SPEC.md` into an actionable implementation plan for evolving the current Fabric Rayfin app into a single multi-page application with:

1. a restricted `Project Register` page
2. a broader `Project Index` page

The plan is structured to preserve the existing deployed Register functionality while adding the new Project Index experience incrementally and safely.

---

## Delivery goals

### Primary goals
- keep the solution as **one application** with multiple pages/routes
- retain current `Project Register` behavior:
  - `Create Project`
  - `Split Project`
  - `Project History`
- add a new `Project Index` page tied to the active `project_guid`
- deliver a UI that is visually close to the provided workbook/screenshots while using standard web interaction patterns
- establish a maintainable data model rather than recreating one large sheet structure

### Non-goals for v1
- no second standalone app
- no attempt to replicate every Excel behavior literally
- no custom Target Programme rows in v1
- no full Board Report workflow in v1
- no dependency on external cost-estimate ingestion in v1

### v2-aligned items to defer unless needed earlier
- Board Report surface and derived outputs
- standard programme templates
- custom Target Programme rows
- richer auto-rollups and dependency engines
- Entra-group-only authorization once role-table model is proven

---

## Recommended delivery phases

## Phase 0 - Stabilize scope and protect existing app

### Objectives
- lock the cleaned functional specification
- document implementation sequencing and dependencies
- avoid regression in the current Register flow

### Deliverables
- `SPEC.md`
- `SPEC-QUESTIONNAIRE.md`
- `IMPLEMENTATION-PLAN.md`

### Exit criteria
- spec and plan are committed
- existing Register assumptions are not changed

---

## Phase 1 - App shell, routing, and permissions foundation

### Objectives
- keep one app
- introduce explicit page-level navigation
- apply permission-sensitive visibility for `Project Register`
- leave current Register features operational

### Scope
1. Add or confirm top-level navigation for:
   - `Project Register`
   - `Project Index`
2. Hide `Project Register` for unauthorized users.
3. Keep defensive checks in services/data operations so hidden UI is not the only access control.
4. Add a simple app-role table for initial authorization.

### Data work
Create an authorization/reference table similar to:
- `app_user_role`
  - `user_identifier`
  - `role_code`
  - `active_flag`
  - `effective_from`
  - `effective_to`
  - audit columns

Likely initial roles:
- `project_register_admin`
- `project_index_admin`
- `project_index_editor`

### UI behavior
- the app should open directly into `Project Index` after sign-in
- unauthorized users do not see the `Project Register` nav item
- if an unauthorized user manually hits the Register route, redirect them to the launcher/home experience without the Register option
- all signed-in users can access `Project Index` in v1
- `Admin` should be implemented as a **global app admin area**, not a project-level tab
- global admin maintenance should still be permission controlled
- top-level navigation should feel closer to a **Microsoft 365-style app launcher/menu** with `Project Register` and `Project Index` as separate destinations

### Dependencies
- access to existing sign-in identity data
- confirmation of how user identity is surfaced in Fabric app runtime

### Exit criteria
- navigation is in place
- Register visibility is permission controlled
- existing Register workflows still function

---

## Phase 2 - Project Index landing page and project selection

### Objectives
- create a separate Project Index route/page
- let users enter via project list instead of by manual deep-linking
- bind all downstream screens to active `project_guid`

### Scope
1. Add Project Index landing page.
2. Add project list/grid with:
   - search by `project_ref`
   - search by `site_code`
   - default columns:
     - `Project Ref`
     - `Project Name`
     - `Site Code`
     - `Gateway`
     - `Reporting Stage`
     - `Project Status`
     - `Reporting Status`
     - `Responsible Manager`
     - `Last Updated`
   - action to open selected project
3. Resolve project selection against `master_project_register`.
4. Historical project behavior in v1:
   - default to active/current projects only
   - provide a `Show History` toggle
   - when a historical ref is surfaced, show actions such as:
     - `Open current`
     - `Open historical`
5. Carry selected `project_guid` through all Project Index tabs.

### Recommended data/query behavior
- treat `master_project_register` as source of project identity
- default the list to active/current project rows
- expose historical lineage through a `Show History` toggle and secondary actions rather than cluttering the main flow

### UI notes
- this page is the first place to establish the new planner-style visual language
- keep the list responsive and easy to scan on mixed device sizes
- structure the navigation and destination selection so it feels closer to a Microsoft 365-style launcher/menu than a traditional left-nav-only app

### Exit criteria
- users can search/select a project from a list
- Project Index detail page opens against the chosen active `project_guid`

---

## Phase 3 - Core data model and audit conventions

### Objectives
- create normalized tables for Project Index data
- establish consistent audit metadata
- separate editable source fields from derived/reporting fields

### Recommended table family

#### 1. Project summary
- `project_index_summary`
  - `project_guid`
  - `project_ref` (optional cached display field)
  - `project_name`
  - `gateway_code`
  - `reporting_stage_code`
  - `sub_stage_code`
  - `project_status_code`
  - `reporting_status_code`
  - `phase_number`
  - `local_authority_code`
  - `origin_of_land_code`
  - `project_description`
  - map/link fields as needed
  - `created_at`
  - `created_by`
  - `updated_at`
  - `updated_by`

#### 2. Project team
- `project_team_member`
  - `project_team_member_guid`
  - `project_guid`
  - `person_name`
  - `staff_username` or `staff_identifier`
  - `directory_object_id` nullable
  - `entry_mode` (`directory`, `free_text`)
  - `is_unverified`
  - `staff_role_code`
  - `team_code`
  - `is_responsible_manager`
  - `last_reviewed_at`
  - audit columns

Recommended v1 rule:
- one person per project only, enforced through application validation and ideally a uniqueness rule once identity semantics are finalized

#### 3. Programme definitions and project programme dates

The programme model should separate **centrally maintained programme definitions** from **project-specific date records**. Adapt names to existing tables where an equivalent already exists rather than duplicating the model.

Recommended definition entities:

- `programme_item_definition`
  - stable item GUID/code
  - `stage_code`
  - `row_label`
  - `row_type` (`activity`, `milestone`, `summary`, `reporting_reference`)
  - `sort_order`
  - optional `level_code`
  - active/effective flags
  - derivation/editability metadata

- `programme_summary_member`
  - summary item definition
  - child item definition
  - ordering/weight metadata if ever needed

- `programme_dependency_definition`
  - predecessor item definition
  - successor item definition
  - dependency type (support at least `FS` in v1)
  - `lag_days`
  - which successor field is derived
  - active/effective flags

- `programme_reporting_mapping`
  - Reporting Programme definition/item
  - Target Programme definition/item
  - mapping purpose/role
  - active/effective flags

Recommended project instance entity (equivalent to the existing `tblProgramme` concept):

- `project_programme`
  - programme record GUID
  - `project_guid`
  - programme item definition FK
  - `baseline_start`
  - `baseline_end`
  - `target_start`
  - `target_end`
  - `reporting_start`
  - `reporting_end`
  - audit columns

V1 rules:
- baseline fields remain in the data model but are not exposed in Project Index operational UI
- Target Programme reads/writes target fields for normal editable activities/milestones
- Reporting Programme reads/writes reporting fields for reporting items
- `summary` rows are calculated, not independently persisted as user-entered dates unless a technical cache is explicitly justified
- `reporting_reference` rows display the mapped Reporting Programme value and are read-only in Target Programme
- dependency-driven fields are calculated/read-only in the project UI

#### 4. Reporting Programme

Reporting Programme is the whole-lifecycle reporting view. It uses the same programme-definition/project-programme model rather than a disconnected parallel set of labels wherever practical.

Required metadata/behaviour:
- reporting row definition and ordering
- `Lvl`
- editability/derived status
- explicit mapping to the relevant Target Programme item where comparison is required
- calculated duration/month values
- reference `RAG`/comment from Target Programme sections

Reporting Programme does not automatically roll up wholesale from Target Programme; explicit mappings allow comparison and variance while preserving separate reporting and target date ownership.

#### 4a. Target Programme stage/detail data

Target Programme stage-specific business attributes should be kept separate from generic programme dates, e.g. Land Activation partner/home counts, Site Pipeline opportunity/home count, Planning flags, DDTC planning status, and section RAG/comment.

Use strongly typed stage/detail entities where fields are materially different rather than adding many nullable columns to `project_programme`.

#### 5. Construction delivery tracker
Either:
- store inside `project_target_programme_item` with `section_code = construction`

Or preferably:
- `project_construction_item`
  - `construction_item_guid`
  - `project_guid`
  - `item_type` (`block`, `works_item`)
  - `block_guid` nullable
  - `item_name`
  - `phase_number`
  - delivery dates
  - `rag_code`
  - `rag_comment`
  - audit columns

#### 6. Tenure tables
- `project_tenure_home`
- `project_tenure_non_resi`
- `project_tenure_facility`
- `project_block_master`
- `project_block_delivery`
- `project_block_tenure`

#### 7. Reference/admin tables
Examples:
- `ref_gateway`
- `ref_reporting_stage`
- `ref_sub_stage`
- `ref_project_status`
- `ref_reporting_status`
- `ref_local_authority`
- `ref_origin_of_land`
- `ref_staff_role`
- `ref_team`
- `ref_partner_flag`
- `ref_planning_status`
- `ref_facility_type`
- `ref_non_resi_unit_type`

### Audit convention
Every editable table should include at least:
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

If soft deletion is needed:
- `is_active`
- `deleted_at`
- `deleted_by`

### Exit criteria
- core tables are created
- table relationships are defined around `project_guid`
- audit behavior is consistent

---

## Phase 4 - Project Information tab

### Objectives
- deliver the first useful Project Index detail experience
- establish editable vs read-only visual treatment
- keep data-entry patterns clean and modern

### Scope

#### 4.1 Header / summary card
Implement:
- `Project Ref` read-only
- `Project Name` editable
- `Gateway` dropdown
- `Reporting Stage` dropdown
- `Sub-Stage` dropdown
- `Project Status` dropdown
- `Reporting Status` dropdown

Derived/read-only values should be visually distinct using standard UI patterns such as:
- muted background
- lock or read-only styling
- disabled text style only where interaction is truly blocked

#### 4.2 Base Info section
Implement:
- derived `Site Code`
- derived `Planning Code`
- derived `Contract Code` with `null` if absent
- editable `Phase`
- `Local Authority` dropdown
- `Origin of Land` dropdown
- `Project Description`
- map preview or external map link

#### 4.3 Project Team grid
Implement as repeating editable grid with:
- row number display
- add row / remove row
- `Responsible Manager` yes/no
- multiple responsible managers allowed
- `Last Reviewed` auto-maintained
- dropdowns for `Staff Role` and `Team`

### UX notes
- this tab should set the design system for the rest of Project Index
- use planner-like layout discipline rather than spreadsheet visuals
- preserve scannability with grouped cards/sections
- v1 should use **field-by-field auto-save** rather than explicit section save buttons where the platform allows it
- show subtle `Saving...` / `Saved` feedback in the page header
- invalid values should be blocked immediately with inline validation
- prefer person selection via directory / Entra-backed search with free-text fallback
- visually mark free-text fallback entries as unverified

### Dependencies
- reference/admin tables
- active project selection shell

### Exit criteria
- Project Information is fully editable and persisted
- derived values are computed from the active project ref
- team grid supports row add/remove/edit

---

## Phase 5 - Shared programme timeline + Reporting Programme

### Objectives
- preserve the working Reporting Programme while extracting reusable programme-planning components
- establish the shared timeline/Gantt engine before implementing Target Programme stages
- keep Reporting Programme as the whole-lifecycle reporting view

### 5.1 Refactor before adding Target Programme UI

Refactor the current Reporting Programme implementation **without changing current behaviour**:
1. Extract pure timeline/date utilities.
2. Extract reusable timeline header rendering.
3. Extract reusable activity-bar and milestone-marker rendering.
4. Extract zoom controls/zoom state.
5. Extract drag/resize/move behaviour into a reusable hook or timeline controller.
6. Introduce a shared `ProgrammeTimelineItem` interface/view model.
7. Keep Reporting Programme-specific grid columns outside the generic timeline engine.
8. Preserve auto-save, validation, section colours, scale-dependent snapping, whole-bar move and end-handle resizing.
9. Verify the Reporting Programme visually and functionally after refactor before Target Programme consumes the shared component.

Recommended component shape:
- `components/programme/ProgrammeTimeline.tsx`
- `components/programme/ProgrammeTimelineHeader.tsx`
- `components/programme/ProgrammeTimelineRow.tsx`
- `components/programme/ProgrammeZoomControls.tsx`
- `hooks/useProgrammeTimeline.ts`
- `utils/programmeTimeline.ts`

Names can vary, but responsibilities should remain separated.

### 5.2 Reporting Programme behavior
- structured grid editing first, with timeline beside it
- field-by-field auto-save
- header-level `Saving...` / `Saved`
- inline validation
- full lifecycle dates across all programme stages
- calculated `Mth`
- `Lvl` support (`B`, `E`, `O`, `P`)
- reference RAG/comment from Target Programme
- explicit Reporting-to-Target mapping where a reporting date is compared with an operational target item

### Exit criteria
- Reporting Programme behaviour is unchanged or intentionally improved with no regression
- shared timeline engine is no longer embedded in the large Project Index page
- shared timeline supports activity bars and milestone markers
- the shared timeline is ready to be consumed by Target Programme
- build, lint and tests pass

---

## Phase 6 - Target Programme v1

### Objectives
- create the detailed operational planning workspace
- implement stage-focused planning using centrally maintained programme definitions
- support summaries, explicit dependencies, reporting references and section-level RAG

### Stage navigation/editability

Stages:
1. Land Activation
2. Site Pipeline
3. Planning
4. Detailed Design, Tender, Contract
5. Construction

Rules:
- opening Target Programme should focus the stage mapped from the project's `Reporting Stage`
- previous stages remain navigable but read-only
- current stage is editable
- future stages remain editable for forward planning
- editability is evaluated dynamically; if Reporting Stage is moved backwards in v1, the relevant stage becomes editable again
- approval workflow for backward stage movement is outside v1
- Reporting Stage -> Target Programme stage mapping must be maintained explicitly in metadata/configuration rather than inferred from labels

### Common row semantics

Centrally maintained definitions support:
- `activity`: target start + target end
- `milestone`: target end only
- `summary`: read-only formula row over a maintained group of child rows
- `reporting_reference`: read-only value from mapped Reporting Programme date

Summary rules:
- summary start = earliest applicable child start
- summary end = latest applicable child end
- summaries can exist at stage level and at intermediate grouping levels
- grey/formula-driven workbook fields become derived/read-only UI fields

### Dependencies

Implement dependency evaluation as programme logic, not as free-form project-user configuration.

V1 requirements:
- dependency definitions are maintained centrally/Admin-side
- normal project UI does not expose dependency editing
- model supports dependency type and `lag_days`; initial business use is primarily zero-lag Finish-to-Start
- a dependency-driven field is visibly read-only
- predecessor movement recalculates successor dates
- propagation continues through the dependency chain
- dependent activity duration is preserved when its derived start moves, unless another rule controls its end
- detect/prevent dependency cycles
- persist only authoritative input dates; derived values should be recomputed consistently in service/domain logic

### Reporting references and mappings
- every Reporting Programme date shown in Target Programme uses an explicit maintained mapping
- reporting-reference rows are read-only
- mapping labels may differ, e.g. Reporting `Contract Award` maps to Target `Issue Award Letters`
- expose target-vs-reporting variance in the view model where useful, even if detailed variance UI is deferred

### Baseline
- preserve baseline fields in the data model
- do not display/edit baseline in v1 Project Index
- baseline is populated through the separate annual budgeting/baseline process and used downstream for reporting/comparison

### 6.1 Land Activation
Implement fixed definitions plus:
- `Partner?`
- `Transferred to Property (# Homes)`
- `Plot for Disposal (# Homes enabled)`
- calculated `Total Homes #`
- section `RAG` / `RAG Comment`

### 6.2 Site Pipeline
Implement fixed definitions plus:
- `Potential Opportunity?`
- `# Homes`
- stage/intermediate summaries as defined
- section `RAG` / `RAG Comment`

Behavior:
- `Potential Opportunity? = Yes` should exclude the project from reporting outputs where required

### 6.3 Planning
Implement fixed definitions plus:
- stage/intermediate summary rows such as `Planning Stage` and `Project Kick-Off - Stage 1A Complete`
- `Advancing Gateway 4?`
- `Planning Granted?`
- `Partial Advance G4: Name`
- `Partial Advance G4: # Homes`
- section `RAG` / `RAG Comment`

### 6.4 Detailed Design / Tender / Contract
Implement fixed definitions plus:
- `Planning Status`
- visually distinct read-only `Reporting Date` reference rows fed from Reporting Programme mappings
- target rows that those reporting dates are compared against
- section `RAG` / `RAG Comment`

### 6.5 Construction
Implement as a delivery tracker, not as the generic target-programme item grid.

Behavior:
- rows can represent linked blocks from `Block Master` or non-block works items
- support many phases
- store live delivery dates
- include row `RAG` / `RAG Comment`
- honour stage read-only/editable rules from Reporting Stage

### Recommended technical approach
- keep programme definition metadata separate from project programme dates
- keep stage-specific attributes separate from generic programme date records
- use the shared Programme Timeline engine from Phase 5 for Land Activation, Site Pipeline, Planning and DDTC
- Construction may reuse lower-level timeline primitives but should remain its own delivery-tracker component/model
- place dependency/summary/mapping calculation in service/domain logic rather than UI components

### Exit criteria
- all agreed Target Programme stages are navigable
- current and future stages edit correctly; previous stages are read-only
- fixed activity/milestone definitions persist project target dates correctly
- summary rows calculate correctly and are read-only
- dependency chains recalculate correctly
- reporting-reference rows display mapped Reporting Programme dates
- section-level RAG flows to Reporting Programme reference views where needed


---

## Phase 7 - Tenure and Block Master

### Objectives
- make `Block Master` the source of truth for blocks
- support manual v1 maintenance for homes, non-resi, and facilities
- connect downstream delivery/reporting fields back to block data

### 7.1 Block Master
Implement block identity management with:
- block create/edit
- `Block Ref`
- `Name`
- `Status`
- one phase per block

Recommended split:
- `project_block_master` for identity
- `project_block_delivery` for planned delivery attributes
- `project_block_tenure` for summarized tenure facts if needed

### 7.2 Homes
Implement editable grid with:
- `Block Selection`
- `Tenure`
- `Home Type`
- `Home Size`
- `Qty`

Derived-from-block fields:
- `Phase #`
- `Phase Start (Reporting)`
- `Phase End (Reporting)`
- `Delivery Year (Reporting)`
- `Block Completion (Target)`

### 7.3 Non-Resi
Implement similar grid with:
- `Block Selection`
- category/type from Admin
- quantity
- area
- any retained descriptive fields needed from current workbook

### 7.4 Facilities
Implement site-based facilities tracker with:
- facility type from Admin
- quantity
- optional block selection where applicable
- support for car parking categories at minimum:
  - residential
  - non-residential
- ideally extensible toward tenure-specific parking splits

### UX notes
- `Tenure` should be tabbed/sub-tabbed inside the Project Index page
- derived values should update when block selections change

### Exit criteria
- blocks can be maintained centrally
- Homes, Non-Resi, and Facilities can reference block data where relevant
- derived block fields populate correctly

---

## Phase 8 - Admin/reference management

### Objectives
- allow approved users to maintain dropdown/reference values without code changes
- reduce hardcoded lists where practical

### Scope
Provide an `Admin` tab or admin view within Project Index for selected reference lists such as:
- gateways
- reporting stages
- sub-stages
- project statuses
- reporting statuses
- local authorities
- origin of land
- staff roles
- teams
- non-resi unit types
- facility types
- possibly Target Programme row definitions in a later phase

### Permission model
- visible only to approved users
- use same initial role-table approach as Register permissions, but separate role codes if needed

### Exit criteria
- key dropdowns can be maintained by admins
- non-admin users cannot edit reference data

---

## Phase 9 - Snapshotting, reporting outputs, and Board Report prerequisites

### Objectives
- support downstream reporting/history needs without overbuilding Board Report in v1
- ensure monthly or point-in-time reporting can be reconstructed later

### Recommended approach
Implement periodic snapshotting of core project index entities such as:
- project summary
- reporting programme
- target programme
- construction tracker
- tenure summaries

Potential tables:
- `project_index_snapshot_batch`
- `project_index_snapshot_item`
- or warehouse-side snapshot tables if the Fabric architecture already prefers that path

### Why this matters
- supports audit/history beyond current-row data
- supports future Board Report outputs
- avoids needing a dedicated board-report history model immediately

### Board Report position
For v1:
- do not build full Board Report entry/edit workflow unless scope changes
- ensure source data needed by future board outputs is being captured cleanly

For v2:
- derive board outputs into Power BI and/or app summary views
- support printable/exportable presentation

### Exit criteria
- agreed snapshot strategy exists
- future Board Report derivation path is clear

---

## Recommended build order inside engineering sprints

### Current sequence from the present codebase
1. **Programme architecture refactor:** extract the existing Reporting Programme Gantt/timeline into reusable programme components without changing behaviour.
2. Add/align programme definition metadata and the project programme date model (baseline/target/reporting fields).
3. Add summary membership, dependency definitions and Reporting-to-Target mappings.
4. Add Admin maintenance/read-only configuration surfaces needed for programme definitions/dependencies/mappings.
5. Implement Target Programme stage shell and Reporting Stage -> Target stage focus/editability.
6. Implement Land Activation and Site Pipeline using the shared timeline engine.
7. Implement Planning, including intermediate summary rows and dependencies.
8. Implement DDTC, including reporting-reference mappings.
9. Implement Tenure + Block Master as required for Construction.
10. Implement/refine Construction delivery tracker.
11. Snapshot/reporting prerequisites and downstream baseline/variance reporting.
12. visual polish and parity pass against screenshots.

### Why this order
- the existing Reporting Programme becomes the proving ground for reusable programme infrastructure
- shared Gantt/timeline logic is extracted once before four Target Programme stages need it
- programme data semantics are established before stage UI creates ad-hoc structures
- dependencies and reporting mappings are explicit metadata rather than buried in UI code
- Construction remains correctly separated from the generic stage programme model

---

## Confirmed programme architecture decisions

The following are no longer open design questions:
- standard programme activities/milestones are centrally defined across projects in v1
- milestone = end date only; activity = start + end
- summary rows derive earliest child start/latest child end and are read-only
- previous Target stages are read-only; current and future stages are editable
- Reporting Stage determines the focused/current Target stage and dynamic editability
- changing Reporting Stage backwards unlocks the corresponding stage in v1
- Reporting-reference rows are read-only and map explicitly to Reporting Programme dates
- each relevant reporting date maps explicitly to the Target Programme item used for comparison
- dependencies are centrally defined; dependent fields are read-only
- dependency changes propagate through chains
- dependency model supports lag, with normal project UI not exposing lag configuration
- v1 business dependencies are primarily explicit same-day Finish-to-Start relationships
- baseline dates remain in the data model but are not visible/editable in the operational UI

## Remaining high-priority confirmations
1. Exact parsing rules for deriving `Site Code`, `Planning Code`, and `Contract Code`.
2. Final reference lists for Gateway, Reporting Stage, Sub-Stage, Project Status and Reporting Status.
3. Final centrally maintained programme row catalogue, summary memberships, dependency catalogue and Reporting-to-Target mapping catalogue.
4. Whether staff users come from free text, controlled list, or directory lookup for the final production implementation.
5. Construction BCAR/hand-over semantics before Construction is finalized.


---

## Suggested technical principles

### 1. Config-driven structure where it reduces future churn
Use metadata/reference tables for:
- dropdown values
- programme row labels and ordering where practical
- section visibility flags

### 2. Derived fields should not be edited directly
Examples:
- project-ref-derived codes
- block-derived reporting fields
- formula-style totals such as `Total Homes #`

### 3. Separate source-of-truth ownership clearly
- project identity: current master register tables
- project summary and team: Project Information tables
- operational planning: Target Programme
- reporting outputs: Reporting Programme
- block identity: Block Master
- live delivery dates for construction: Construction tracker

### 4. Optimize for mixed device usage
- prioritize readable layouts and sticky context headers
- use grouped sections instead of giant uninterrupted grids where possible
- preserve dense information display without forcing spreadsheet behavior

### 5. Build visual parity as an explicit pass
After functional rollout, run a focused UI polish pass against the screenshots covering:
- spacing
- section headers
- tab treatment
- editable/read-only affordances
- planner-style timeline treatment
- brand color application

---

## Implementation orchestration via GitHub

Use GitHub as the durable hand-off layer between product/architecture planning and the coding agent.

### Source of truth
- `SPEC.md` = product/business requirements and confirmed behaviour
- `IMPLEMENTATION-PLAN.md` = architecture, sequencing and implementation constraints
- `SPEC-QUESTIONNAIRE.md` = decision log plus genuinely unresolved questions
- GitHub Issues = one atomic implementation task at a time
- Pull Requests = implementation result, tests, review and acceptance record

### Recommended loop
1. Orchestrator reviews current repo + canonical MD files.
2. Orchestrator creates/refines one scoped GitHub Issue with acceptance criteria and references to the relevant MD sections.
3. Coding agent implements **only that issue** on a dedicated branch.
4. Coding agent runs required build/lint/tests and posts a concise completion report.
5. Coding agent opens a PR linked to the issue.
6. Orchestrator reviews diff/PR against the spec and acceptance criteria.
7. Any gaps become targeted PR comments or a follow-up issue; avoid expanding scope silently inside the current PR.
8. Once accepted and checks pass, merge.
9. Update the canonical docs only when a decision/architecture change occurred, then select the next issue.

### Issue template content
Each implementation issue should include:
- **Goal**
- **Why now / dependency**
- **In scope**
- **Out of scope**
- **Relevant spec/plan sections**
- **Required behaviour**
- **Technical constraints**
- **Acceptance criteria**
- **Required checks** (`build`, `lint`, `test`, plus manual UI checks where applicable)
- **Completion report format**

### Agent guardrails
- do not redesign requirements while implementing
- do not add unrelated refactors/dependencies unless required by the issue
- preserve existing behaviour unless the issue explicitly changes it
- keep reusable programme logic out of large page components
- report assumptions/blockers rather than silently inventing business rules
- PR description must list changed files, tests/checks, manual verification, and known follow-ups

---

## Risks and mitigations

### Risk: trying to recreate Excel too literally
Mitigation:
- preserve business structure, not workbook mechanics
- use native app patterns for editing, state, and navigation

### Risk: too much hardcoded structure
Mitigation:
- make row definitions and dropdowns metadata-driven where cost-effective
- defer full templating until v2 if needed

### Risk: permissions enforced only in UI
Mitigation:
- add service/data-layer checks for restricted actions

### Risk: construction and block modeling overlap
Mitigation:
- keep block identity in `Block Master`
- keep live delivery tracking in Construction-specific data

### Risk: Board Report expectations creep into v1
Mitigation:
- capture source data and snapshots now
- explicitly defer presentation/output experience to v2

---

## Recommended definition of done for v1

The v1 release should be considered complete when:
- the app remains a **single app** with `Project Register` and `Project Index`
- `Project Register` remains functional and is permission-restricted
- users can search/select projects from a Project Index list
- Project Information is editable and persisted
- Reporting Programme is available with a v1 gantt/timeline
- Target Programme stages are available with fixed definitions, stage-aware editability, summaries, mapped reporting references, dependency propagation and RAG tracking
- Tenure sub-tabs and Block Master are available
- Construction delivery tracking is available
- Admin-maintained dropdown/reference lists are in place
- snapshot/reporting groundwork is defined or implemented sufficiently for future Board Report derivation

---

## Immediate next implementation step

**Next coding-agent ticket: Refactor the existing Reporting Programme timeline/Gantt into reusable programme components without changing its current user-visible behaviour.**

The ticket should:
- extract timeline utilities, header, row/bar/milestone primitives, zoom controls and drag/resize logic
- introduce a shared programme timeline view-model/interface
- keep Reporting Programme-specific grid fields separate from the generic timeline engine
- preserve current autosave, validation, zoom, snapping, bar movement and resize behaviour
- avoid implementing Target Programme UI in the same ticket
- require `npm run build`, `npm run lint` and `npm run test` (or document any pre-existing failures)
- include manual verification that Reporting Programme still behaves as before

After that ticket is accepted, the next ticket should establish/align programme definition metadata, project programme dates, summary membership, dependencies and Reporting-to-Target mappings before Target Programme stage UI is built.
