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
- unauthorized users do not see the `Project Register` nav item
- all signed-in users can access `Project Index` in v1
- `Admin` maintenance within Project Index should still be permission controlled

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
   - key summary columns
   - action to open selected project
3. Resolve project selection against `master_project_register`.
4. Decide how historical refs are presented:
   - either active + historical rows
   - or active rows with an explicit history action
5. Carry selected `project_guid` through all Project Index tabs.

### Recommended data/query behavior
- treat `master_project_register` as source of project identity
- default the list to active/current project rows
- expose historical lineage through a secondary action rather than cluttering the main flow

### UI notes
- this page is the first place to establish the new planner-style visual language
- keep the list responsive and easy to scan on mixed device sizes

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
  - `staff_role_code`
  - `team_code`
  - `is_responsible_manager`
  - `last_reviewed_at`
  - audit columns

#### 3. Reporting Programme
- `project_reporting_programme_item`
  - `reporting_programme_item_guid`
  - `project_guid`
  - `section_code`
  - `row_code`
  - `row_label`
  - `level_code`
  - `sort_order`
  - `is_editable`
  - `reporting_date`
  - `start_date`
  - `end_date`
  - `month_value`
  - cached reference fields for `rag_code` / `rag_comment`
  - audit columns

#### 4. Target Programme
- `project_target_programme_item`
  - `target_programme_item_guid`
  - `project_guid`
  - `section_code`
  - `row_code`
  - `row_label`
  - `row_type` (`milestone`, `activity`, `summary`, `reporting_reference`)
  - `sort_order`
  - `start_date`
  - `end_date`
  - `reporting_date`
  - `status_code`
  - section-specific value columns or linked detail values
  - `rag_code`
  - `rag_comment`
  - `dependency_key` / `depends_on_row_code` if implemented in v1
  - audit columns

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
- preserve scannability with grouped cards/sections and sticky save/toolbar behavior if available

### Dependencies
- reference/admin tables
- active project selection shell

### Exit criteria
- Project Information is fully editable and persisted
- derived values are computed from the active project ref
- team grid supports row add/remove/edit

---

## Phase 5 - Reporting Programme v1

### Objectives
- deliver workbook-like reporting content in a more modern interface
- preserve editable vs derived behavior
- introduce the first visual programme/timeline experience

### Scope
1. Create Reporting Programme section layout matching the agreed structure.
2. Distinguish:
   - editable reporting fields
   - derived/formula-style fields
3. Calculate and show `Mth`.
4. Support `Lvl` values:
   - `B`
   - `E`
   - `O`
   - `P`
5. Show reference `RAG` and `RAG Comment` from relevant Target Programme sections.
6. Add a gantt/timeline visualization.

### Recommended v1 interaction model
- grid editing for dates and reporting values
- gantt bars render from stored dates
- no drag-to-edit requirement in v1 unless the underlying component is reliable and low-risk

### Visual design guidance
- preserve a close overall structure to the screenshot
- use normal web conventions for editability instead of yellow Excel cells
- use brand greens for shell accents, headings, and active states
- use contrasting complementary colors for visible reporting-date rows as requested

### Technical notes
- keep row definitions config-driven where possible
- allow formula-like derived fields to be computed in service/view-model logic rather than manually entered

### Exit criteria
- Reporting Programme supports edit + persist for reporting fields
- derived fields are rendered correctly
- gantt/timeline is visible for v1

---

## Phase 6 - Target Programme v1

### Objectives
- create the operational planning workspace
- support milestone/activity structure across the agreed sections
- provide section-level RAG tracking

### Common implementation pattern
For each section:
- fixed row definitions in v1
- row type supports milestone vs activity
- editable dates
- section-specific fields where required
- `RAG`
- `RAG Comment`
- optional dependency metadata

### 6.1 Land Activation
Implement fixed rows with:
- `Partner?`
- `Transferred to Property (# Homes)`
- `Plot for Disposal (# Homes enabled)`
- calculated `Total Homes #`
- section `RAG` / `RAG Comment`

### 6.2 Site Pipeline
Implement fixed rows with:
- `Potential Opportunity?`
- `# Homes`
- mixed milestone/summary gateway rows
- section `RAG` / `RAG Comment`

Behavior:
- `Potential Opportunity? = Yes` should exclude the project from reporting outputs where required

### 6.3 Planning
Implement fixed rows with:
- `Advancing Gateway 4?`
- `Planning Granted?`
- `Partial Advance G4: Name`
- `Partial Advance G4: # Homes`
- section `RAG` / `RAG Comment`

### 6.4 Detailed Design / Tender / Contract
Implement fixed rows with:
- standard v1 structure
- `Planning Status`
- visually distinct `Reporting Date` reference rows fed from Reporting Programme
- section `RAG` / `RAG Comment`

### 6.5 Construction
Implement as a delivery tracker, not a block-definition area.

Behavior:
- rows can represent:
  - linked block items from `Block Master`
  - non-block works items such as infrastructure
- support many phases
- store live delivery dates
- include row `RAG` / `RAG Comment`

### Recommended technical approach
- maintain row definitions in config/reference tables so labels and sort order are editable without code churn later
- keep user-entered instances separate from static row-definition metadata

### Exit criteria
- all agreed Target Programme sections are available in v1
- rows are fixed and persist correctly
- section-level RAG flows through to Reporting Programme reference views where needed

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

### Sprint sequence
1. Phase 1: app shell + permissions
2. Phase 2: project list and project selection
3. Phase 3: core data model + reference tables
4. Phase 4: Project Information
5. Phase 8: Admin basics for required dropdowns
6. Phase 5: Reporting Programme v1 shell + timeline
7. Phase 6: Target Programme sections
8. Phase 7: Tenure + Block Master
9. Construction completion/refinement if not already folded into Phase 6
10. Phase 9: snapshots/reporting prerequisites
11. visual polish and parity pass against screenshots

### Why this order
- protects current Register behavior first
- establishes selection and data model before heavy UI work
- gets a useful editable Project Information slice live early
- unlocks dropdown-driven tabs through Admin before deep rollout
- leaves Board Report as future-facing work without blocking v1

---

## Key dependencies and design decisions to confirm early

### High-priority confirmations
1. Exact parsing rules for deriving `Site Code`, `Planning Code`, and `Contract Code`
2. Final reference lists for:
   - Gateway
   - Reporting Stage
   - Sub-Stage
   - Project Status
   - Reporting Status
3. Whether staff users come from free text, controlled list, or directory lookup
4. Whether historical project refs should be shown inline in the main list or via a history action
5. Which gantt/timeline component is acceptable in the Fabric app context
6. Whether Target Programme row definitions should be hardcoded for first release or stored as metadata immediately

### Lower-priority confirmations
- whether child programme rows need automatic rollup in v1
- whether gantt bars should be draggable
- whether any project types need variant Target Programme structures in v1

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
- Target Programme sections are available with fixed rows and RAG tracking
- Tenure sub-tabs and Block Master are available
- Construction delivery tracking is available
- Admin-maintained dropdown/reference lists are in place
- snapshot/reporting groundwork is defined or implemented sufficiently for future Board Report derivation

---

## Immediate next implementation step

Start with **Phase 1 and Phase 2 together** if capacity allows:
- add page navigation and permission gating
- add the Project Index landing page with project search/select

That creates the application shell needed for all later detail tabs without risking the existing Register workflows.
