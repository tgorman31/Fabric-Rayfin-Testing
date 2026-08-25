# Project Register / Project Index Specification

## Purpose

This document defines the agreed scope and direction for evolving the existing Rayfin app into a single application with:

1. a restricted `Project Register` area for project creation, splitting, and lineage management
2. a broader `Project Index` area for project information, programme management, tenure, construction tracking, and administration

This is the cleaned working specification based on the existing app, the user's screenshots, and the confirmed answers captured during the questionnaire pass.

The intended end-state is a **project programme management workspace** that replaces the current Excel-based Project Index as the operational application for structured project information, detailed target programming, lifecycle reporting dates, programme visualisation, dependencies, delivery tracking, and future reporting outputs. The Excel workbook is the business-template starting point, not the target UX or technical architecture.

---

## Product direction

### Application shape

Keep this as **one Rayfin app** with multiple pages and permission-sensitive sections.

### Top-level pages

1. `Project Register`
   - `Create Project`
   - `Split Project`
   - `Project History`
   - restricted to approved users only

2. `Project Index`
   - separate page/route from `Project Register`
   - project search/list and project workspace
   - broader editing audience

### General product principle

Although the current tool was built in Excel, the target application should not be constrained to spreadsheet behavior where a better application pattern exists.

Confirmed direction:
- the screenshots represent the organization's **standard programme structure** and the milestones/activities that should be captured
- the app should behave as a **lightweight project programme-management tool**, not merely reproduce the workbook
- useful behaviors include:
  - milestones
  - activities
  - planner-style timeline/gantt
  - formula-driven summary rows
  - explicit dependencies/interdependencies
  - dependency propagation when predecessor dates move
  - stage-based maintenance of Target Programme sections
  - explicit mapping between Reporting Programme dates and Target Programme activities/milestones
- rows with an `End Date` only are **milestones**
- rows with `Start Date` and `End Date` are **activities**
- v1 uses a centrally defined, fixed set of milestones/activities across projects; project users do not add custom programme rows
- development managers should keep the current and future `Target Programme` stages planned, with the current stage receiving the primary operational focus
- previous Target Programme stages are visible but read-only
- the current stage is derived from `Reporting Stage`; if Reporting Stage is moved backwards in v1, the corresponding stage becomes editable again
- users should keep Reporting Programme dates current regardless of the active target stage
- baseline dates exist in the underlying programme data for downstream comparison/reporting but are **not exposed in the v1 operational UI**

---

## Access and security

### Project Register access

Confirmed direction:
- initial implementation should use a **role table in app data**
- longer term, this should likely move to **Entra group-based access**
- unauthorized users should **not see the Project Register page at all**

### Project Index access

Confirmed direction:
- for now, **all signed-in users** can edit Project Index data
- for now, there is **no tab-level read-only split** by user type
- audit/update history should be captured across edit tables

### Recommended implementation behavior

At UI level:
- hide `Project Register` navigation for unauthorized users
- show `Project Index` to standard users

At data/service level:
- keep defensive checks in service code
- capture `created_*` / `updated_*` metadata on editable records

---

## Existing master data context

The current app already owns the project identity model through:
- `master_site_register`
- `master_project_register`

Important rule:
- all downstream Project Index data should link to the **active `project_guid`** in `master_project_register`

Recommended FK pattern for downstream tables:
- `project_guid`
- optionally `project_ref` for display/search
- optionally `site_guid` / `root_guid` for reporting convenience

---

## Project Index information architecture

### Entry and project selection

Confirmed direction:
- users should enter Project Index from a **project list**
- the list should support search/filter by:
  - `project_ref`
  - `site_code`
- default view should show **active/current projects only**
- users should have a **Show History** toggle to include historical records
- default visible columns should include:
  - `Project Ref`
  - `Project Name`
  - `Site Code`
  - `Gateway`
  - `Reporting Stage`
  - `Project Status`
  - `Reporting Status`
  - `Responsible Manager`
  - `Last Updated`
- longer term, that list may be filtered to a user's projects
- if a historical project ref is involved, the user should be able to **choose** what to do
- preferred historical-ref behavior is to show the historical record with actions such as:
  - `Open current`
  - `Open historical`

### Top-level tabs

1. `Project Information`
2. `Reporting Programme`
3. `Target Programme`
4. `Tenure`
5. `Board Report` (v2)
6. `Admin`

### Admin

Confirmed direction:
- there should be a **global app Admin area** rather than project-specific admin
- approved users should be able to maintain dropdown/reference options there
- there are no confirmed project-specific reference lists at present

### Shared shell

Confirmed direction:
- the app should open users directly into **Project Index** after sign-in
- top-level app navigation should feel closer to a **Microsoft 365-style app launcher/menu** with `Project Register` and `Project Index` as distinct options
- users should be able to switch destinations through that launcher/menu
- if an unauthorized user manually requests the `Project Register` route, they should land on the launcher/home experience **without** the Register option
- inside `Project Index`, use a **hybrid navigation model**:
  - major area navigation at the top level
  - sub-tabs within sections such as `Tenure`
- v1 save behavior should be **auto-save field by field**
- v1 should show a subtle **Saving... / Saved** status in the page header
- invalid values should be blocked from saving immediately with an inline validation error
- if the same project is open in multiple sessions, v1 should show a simple **last editor / last updated** style indicator rather than hard locking

Common header context is expected to include:
- `Project Ref`
- `Project Name`
- `Gateway`
- `Reporting Stage`
- `Sub-Stage`
- `Project Status`
- `Reporting Status`

---

## Data modeling strategy

The Project Index should be decomposed into multiple related tables rather than one wide sheet-like table.

A likely model family includes:
- `project_index_summary`
- `project_team_member`
- programme definition/reference tables
- project programme date records
- programme dependency definitions
- Reporting-to-Target programme mappings
- `project_tenure_home`
- `project_tenure_non_resi`
- `project_block_master`
- `project_block_delivery`
- `project_block_tenure`
- admin reference/lookup tables

### Programme data principle

Programme row identity/metadata should be separated from project-specific programme dates. This reflects the existing underlying approach where a milestone/activity definition is stored separately and a project programme record references it by foreign key.

The project programme record should be capable of holding, per programme item:
- `baseline_start`
- `baseline_end`
- `target_start`
- `target_end`
- `reporting_start`
- `reporting_end`

V1 UI ownership is:
- `Target Programme` edits/displays **target** dates for normal operational rows
- `Reporting Programme` edits/displays **reporting** dates for lifecycle reporting rows
- **baseline** dates remain hidden from operational users and are retained for downstream reporting/variance analysis

Programme definitions should also hold or reference:
- stage
- row label and ordering
- row type (`activity`, `milestone`, `summary`, `reporting_reference`)
- summary membership/rules
- editability/derivation rules
- dependency definitions
- explicit Reporting-to-Target mapping where relevant

Construction should use its own delivery-tracker model even though it appears as a Target Programme stage in the user experience.

---

# 1. Project Information

## 1.1 Summary/header

Confirmed field behavior:
- `Project Ref`: read-only
- `Project Name`: editable
- `Gateway`: editable dropdown
- `Reporting Stage`: editable dropdown
- `Sub-Stage`: editable dropdown
- `Project Status`: editable dropdown, manually maintained
- `Reporting Status`: editable dropdown

Confirmed rules:
- `Project Ref` remains register-controlled
- `Project Status` is **not** derived from lineage
- `Gateway` comes from a fixed list
- `Reporting Stage` comes from a fixed list

## 1.2 Base Info

Confirmed rules:
- `Site Code`, `Planning Code`, and `Contract Code` are **derived automatically** from the active project ref
- if there is no contract code, `Contract Code` is `null`
- `Phase` is numeric
- `Local Authority` is a lookup/dropdown
- `Origin of Land` is a lookup/dropdown
- `Project Description` is plain text only
- map preview should be supported from coordinates and/or Google Maps link

Remaining open items:
- confirm exact parsing convention for `Planning Code` / `Contract Code`
- confirm whether `Site Name` and `Public Name` are both mandatory

## 1.3 Project Team

Confirmed rules:
- repeating editable grid
- `ID` is a display row number
- `Responsible Manager` is a yes/no flag
- multiple rows may be marked as responsible manager
- `Last Reviewed` is auto-maintained
- users may add/remove rows freely
- `Staff Role` is a dropdown
- `Team` is a dropdown
- person selection should preferably use **directory / Entra-backed search**
- if directory resolution is unavailable or incomplete, users should be able to **fall back to free text**
- free-text people entries should be allowed but clearly marked as **unverified**
- the same person should appear **only once per project** in v1
- in-app historical retention is not required for now; downstream snapshotting/warehousing will handle history

## 1.4 Facilities

Confirmed correction:
- `Facilities` should **not** exist under `Project Information`
- `Facilities` belongs only under `Tenure`

---

# 2. Reporting Programme

## Overall behavior

Confirmed direction:
- `Reporting Programme` is the **whole-lifecycle reporting view** for the project at any point in time
- it provides a condensed view of key dates across all stages, regardless of which Target Programme stage is currently active
- it is **hybrid**: some reporting dates are directly maintained and some fields are formula/derived
- yellow workbook cells do not need to be mimicked literally, but the same editable vs derived distinction should exist
- grey workbook fields represent formula-driven/derived values and should render as read-only in the app
- `RAG` and `RAG Comment` are maintained on the relevant `Target Programme` section and shown here for reference only
- `Mth` is calculated from dates
- `Lvl` is the visibility level of the data point:
  - `B` = Board
  - `E` = Executive
  - `O` = Operational / Business level
  - `P` = Project team
- allowed `RAG` values are `R`, `A`, `G`
- timeline/gantt is required in the first release
- the preferred v1 layout is a **structured editable grid first**, with the timeline shown **beside** the grid where space allows
- the first delivered build should include the **full Reporting Programme section structure**, even if some rows start as placeholders
- Reporting Programme does **not automatically roll up** wholesale from Target Programme
- nevertheless, each Reporting Programme date that is compared with an operational Target Programme date must have an **explicit maintained mapping** to the relevant Target Programme item; labels do not need to match
- example: `Contract Award (Reporting Date)` maps to the Target Programme item `Issue Award Letters`
- this mapping enables reporting-vs-target comparison/variance without making the two date sets the same source of truth
- standard programme templates are a good `v2` idea, not required for v1

Remaining open items:
- whether `Gateway`, `Reporting Stage`, and `Sub-Stage` are edited directly here or inherited elsewhere
- whether all rows or only key rows surface reference `RAG`
- exact roll-up/formula rules for any Reporting Programme summary rows not already defined

---

# 3. Target Programme

## 3.1 Overall behavior

Confirmed direction:
- `Target Programme` is the **detailed operational programme** and operational source of truth for target dates
- it is split into standard programme stages:
  1. `Land Activation`
  2. `Site Pipeline`
  3. `Planning`
  4. `Detailed Design, Tender, Contract`
  5. `Construction`
- users should be focused on the project's **current Reporting Stage** when opening Target Programme, but must be able to navigate to all stages
- previous stages are visible but **read-only**
- the current stage is editable
- future stages are editable so downstream planning can begin before the project formally enters those stages
- stage editability is calculated dynamically from `Reporting Stage`; in v1, changing Reporting Stage backwards unlocks the corresponding earlier stage again
- formal approval/governance for moving backwards through stages is outside v1 scope
- current milestone/activity names and ordering are centrally defined by Admin and shared across projects
- users should **not** add custom rows in v1
- project-user row extensibility is a `v2` idea
- the UX should behave like a modern planning tool rather than a workbook where helpful

### Programme row semantics

V1 programme definitions support these row types:
- `activity`: has `Start Date` and `End Date`
- `milestone`: has `End Date` only
- `summary`: formula-driven/read-only row derived from a defined group of child rows
- `reporting_reference`: read-only Target Programme row that displays the mapped Reporting Programme date

Rules:
- a normal activity/milestone exposes the project's **target** dates
- a summary row is read-only and derives:
  - start = earliest applicable child start; for a milestone child, its `target_end` point date is the start candidate
  - end = latest applicable child end; for a milestone child, its `target_end` point date is the end candidate
  - therefore a milestone point date contributes to both summary Start and summary End range calculation
- summary rows are not limited to one per stage; nested/intermediate summaries are valid, e.g. `Project Kick-Off - Stage 1A Complete` in Planning
- any field that was grey/formula-driven in the workbook should be represented as derived/read-only rather than independently editable
- reporting-reference rows are read-only in Target Programme and display the relevant **reporting** date from the mapped Reporting Programme item

### Reporting-to-Target mapping

Every Reporting Programme date that is shown/referenced in Target Programme must map explicitly to the Target Programme activity or milestone against which it should be compared.

The mapping is metadata, not label inference. For example:
- Reporting Programme `Contract Award` / Target Programme `Contract Award (Reporting Date)` -> Target Programme `Issue Award Letters`

This allows target-vs-reporting variance analysis even when business labels differ.

### Dependencies

Dependencies are part of the v1 programme model.

Confirmed rules:
- dependency definitions are centrally maintained/admin-defined rather than created by normal project users
- v1 project UI does not expose dependency configuration
- the model should support dependency `lag` even though lag configuration is not exposed in the normal project UI
- current business dependencies are predominantly explicit same-day Finish-to-Start relationships, e.g. predecessor `End Date` = successor `Start Date`
- a dependency-driven field is read-only in the project UI; users change the predecessor rather than overriding the calculated successor field
- when a predecessor date moves, dependent dates should recalculate automatically
- propagation continues through the dependency chain (`A -> B -> C -> D`)
- where a dependent activity moves because its derived start changes, its duration should be preserved and its end should move accordingly unless that end is itself governed by another explicit rule
- the underlying design should prevent dependency cycles

### Baseline dates

The underlying programme model may store baseline, target and reporting date sets per programme item.

For v1:
- baseline dates are established through the separate annual budgeting/baseline process
- baseline dates are **not visible or editable** in the operational Project Index UI
- baseline is retained for downstream reporting and comparison outside the operational planning screens

## 3.2 Land Activation

Confirmed rules:
- v1 rows are a fixed centrally defined list
- stage and intermediate summary rows are formula-driven/read-only where defined
- `Partner?` is a dropdown
- `Transferred to Property (# Homes)` is numeric and manual
- `Plot for Disposal (# Homes enabled)` is numeric and manual
- `Total Homes #` is numeric and calculated
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- meaning of legacy hatched chart segments where they are not explained by dependency/derived-date behaviour

## 3.3 Site Pipeline

Confirmed rules:
- v1 rows are a fixed centrally defined list
- `Potential Opportunity?` is used to filter the project out of reporting when `Yes`
- `# Homes` is manual
- Gateway rows may be milestones or summary rows according to the maintained definition
- formula-driven summary/dependency rows are read-only
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- whether the section applies only to certain project types/gateways in a future template model

## 3.4 Planning

Confirmed rules:
- v1 rows are a fixed centrally defined list
- `Planning Stage` and intermediate rows such as `Project Kick-Off - Stage 1A Complete` may be summary rows over defined child groups
- `Advancing Gateway 4?` values are:
  - `Yes`
  - `No`
  - `Yes (Partial)`
- `Planning Granted?` values are:
  - `Yes`
  - `No`
- `Partial Advance G4: Name` is used when only part of a project advances, e.g. a block or phase
- this may later be superseded by project split logic
- `Partial Advance G4: # Homes` is manual
- section has its own `RAG` and `RAG Comment`

## 3.5 Detailed Design, Tender, Contract

Confirmed rules:
- v1 rows are a fixed centrally defined list
- `Reporting Date` rows are read-only `reporting_reference` rows fed from Reporting Programme
- every such reporting row has an explicit mapping to the operational Target Programme item used for comparison
- `Planning Status` values are:
  - `Not Lodged`
  - `Lodged`
  - `Granted`
- v1 should keep one standard structure rather than branching by procurement route/contract type
- longer term, target structure should be maintained/configurable through Admin metadata rather than code
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- whether split contracts need different structures in a future template model
- exact mapping catalogue between Reporting Programme dates and DDTC Target Programme items

## 3.6 Construction

Confirmed direction:
- Construction should remain functionally similar overall, but not identical to the current screenshot implementation
- building blocks should **not** be created in Construction
- blocks should be created in `Tenure > Block Master`
- Construction should behave as a **separate delivery tracker** even though it appears as the fifth Target Programme stage
- Construction rows should support:
  - a block selected from `Block Master`, or
  - a free-form works item such as `Infrastructure works`
- the screenshot column set is broadly a valid starting point
- the phase model must support significantly more phases than shown in the screenshot
- example raised: a project with **17 phases**
- `RAG` / `RAG Comment` apply **per delivery item row**
- `Construction` should hold the live delivery dates
- the Target Programme stage navigation/editability rules still determine whether Construction is the current/future editable stage or a previous read-only stage

Remaining open items:
- whether the top chart is generated from the delivery-item grid
- whether `Handed over to Asset Management` is a date, status, or both
- whether BCAR data is mandatory on all rows
- whether construction rows may later sync/import from another system

---

# 4. Tenure

## 4.1 Overall direction

Confirmed direction:
- Tenure should include:
  - `Homes`
  - `Non-Resi`
  - `Facilities`
  - `Block Master`
- `Block Master` is the **source of truth** for construction blocks
- `Block Master` contains **real building blocks only**, not general delivery items
- Tenure serves both as:
  - a delivery-definition area feeding Construction
  - a reporting area
- v1 data is maintained manually in the app
- future ingestion from a Cost Estimate file is possible

## 4.2 Homes

Confirmed rules:
- these values are derived from the selected block:
  - `Phase #`
  - `Phase Start (Reporting)`
  - `Phase End (Reporting)`
  - `Delivery Year (Reporting)`
  - `Block Completion (Target)`
- retained editable fields are:
  - `Block Selection`
  - `Tenure`
  - `Home Type`
  - `Home Size`
  - `Qty`
- `Block Selection` comes from `Block Master`
- each Homes row belongs to **one block**
- `Qty` is manual

Remaining open items:
- allowed values for `Tenure`, `Home Type`, `Home Size`
- chart outputs required from the row data
- whether homes need extra affordability/funding metadata

## 4.3 Non-Resi

Confirmed rules:
- same block-derived reporting pattern as Homes
- derived from selected block:
  - `Phase #`
  - `Phase Start (Reporting)`
  - `Phase End (Reporting)`
  - `Delivery Year (Reporting)`
  - `Block Completion (Target)`
- retained fields are:
  - `Block Selection`
  - `Unit Type`
  - `Original € Estimate (per unit)`
  - `Current Cost`
  - `Market value`
  - `Gross Internal Area (m2)`
  - `Qty`
- `Block Selection` comes from `Block Master`
- key measures are **both** quantity and area
- `Unit Type` / category values come from the `Admin` references page

Remaining open items:
- whether cost/value fields are per-unit or per-row totals
- currency precision
- whether GIA is per-unit or per-row
- whether totals/subtotals are required

## 4.4 Facilities

Confirmed direction:
- this tab captures site-based facilities items such as car park spaces and similar quantities
- key use case: track the number of car park spaces
- at minimum, car park spaces need to be known by:
  - resi
  - non-resi
- ideally, car park spaces should also be known by **tenure type**
- `Block Selection` is likely workable because blocks are usually not mixed tenure
- key measure is **quantity**
- facility type/category list is not yet finalized
- facility type values should come from the `Admin` references page

Remaining open items:
- whether Facilities uses the same block-derived phase/reporting pattern as Homes/Non-Resi
- whether the row model explicitly stores tenure type
- whether Facilities should feed board reporting later

## 4.5 Block Master

Confirmed direction:
- `Block Master` defines the **block identity layer**
- underlying block-related data is expected to split into:
  - `Block Master`
  - `Block Delivery`
  - `Block Tenure`

Expected structures:

### Block Master
- `guid`
- `project_guid`
- `name`
- `block_ref`
- `status`

### Block Delivery
- `guid`
- `block_guid`
- `phase_number`
- `start_date`
- `completion_date`
- `effective_from`
- `effective_to`

### Block Tenure
- `guid`
- `block_guid`
- `tenure`
- `home_type`
- `home_size`
- `qty`
- `effective_from`
- `effective_to`

Confirmed rules:
- each block belongs to **one phase**
- `Block Ref` is manual
- block history does not need to be modeled in-app for now; warehousing handles historical tracking
- `Block Master` defines identity only
- `Construction` holds live delivery dates

Remaining open items:
- allowed block statuses
- uniqueness rules for `Block Name` and `Block Ref`
- whether only the latest delivery row is maintained live in-app

---

# 5. Board Report

Confirmed direction:
- `Board Report` is a **v2 capability**
- likely long-term reporting solution should use **Power BI**
- the shared screens represent current data entry points for board reporting, especially for **construction**
- there is also a slightly different **pre-construction** version
- current sections include:
  - `Summary`
  - `Health & Safety`
  - `Commercial`
  - `Monthly Progress`
- outputs are currently expected to be printable/exportable
- longer term, the preferred experience is a summarized web view in-app and/or Power BI
- the business wants **snapshots** so board reports can be **derived** from snapshot data
- separate historical board-report storage is probably not needed if snapshotting handles history

Recommended v1/v2 split:
- **v1**: capture underlying data needed to support future reporting
- **v2**: build board-report presentation/output behavior

Remaining open items:
- for any future in-app board-report view, which sections remain narrative vs generated
- whether pre-construction and construction board reports are separate templates/views
- most important export format: PDF, PowerPoint, or both

---

# 6. UX and visual fidelity

Confirmed direction:
- first implementation should prioritize a **close visual match** to the screenshots
- the UI does not need to mimic yellow Excel cells literally
- instead, use standard **web UI indicators** for editable vs read-only content
- timeline/gantt should lean **modern planner-style**
- app should be optimized for **mixed** usage, not desktop-only

### Brand colors
- Dark Green: `#025437`
- Middle Green: `#006838`
- Light Green: `#8fb73e`
- Black: `#000000`
- Medium Grey: `#5a5a5a`
- White: `#ffffff`

### Stage colors
- for `Target Programme` stages, exact brand matching is less important than approximating the screenshot feel
- visible reporting-date rows should use a **complementary opposite color** to the main stage color

Remaining open items:
- whether print/export styling should closely match the interactive view or be simplified
- whether the planner-style gantt should support drag-and-drop editing in v1 or be visual-first

---

# 7. Delivery phasing

## Phase A - Shell and security
- split app into `Project Register` and `Project Index`
- add role-aware navigation and enforcement for register access
- add project selection/search for Project Index
- establish branded shell with close visual alignment to screenshots

## Phase B - Project Information
- implement shared header/summary
- implement Base Info
- implement Project Team
- remove `Facilities` from Project Information

## Phase C - Programme
- refactor the existing Reporting Programme timeline into a reusable programme timeline/Gantt engine
- implement programme definition metadata, project programme date records, summary rules, dependency definitions, and Reporting-to-Target mappings
- implement Reporting Programme as the whole-lifecycle reporting view
- implement Target Programme as stage-focused operational workspaces using the shared timeline engine
- deliver modern planner-style gantt/timeline interactions in the first release

## Phase D - Tenure and Construction
- implement `Block Master`
- implement Tenure sub-tabs linked from blocks
- implement Construction as a delivery tracker using block definitions

## Phase E - Board Report
- defer to `v2`
- align with snapshot-derived reporting and Power BI

---

# 8. Recommended first implementation slice

The desired end-state is the full scope above.

If delivery needs to be phased practically, the first build should aim for:
- top-level navigation split
- Project Register permissions
- Project Index shell and project selection
- Project Information
  - Summary/Header
  - Base Info
  - Project Team
- Reporting Programme shell
- Target Programme shell
- placeholder tabs where needed for in-progress sections

A more ambitious first release can continue into:
- structured Target Programme sections
- Block Master
- Tenure
- Construction delivery tracker

---

# 9. Open questions summary

The main Target Programme architecture decisions are now confirmed. Remaining items still worth resolving during implementation are:
- exact code parsing and mandatory base-info rules
- project-team directory behavior and duplicate-person rules
- exact Reporting Programme summary/roll-up rules where not already defined
- full catalogue of Reporting-to-Target date mappings
- final centrally maintained programme row definitions, summary memberships, and dependency definitions
- meaning of any legacy hatched timeline styling not explained by dependency/derived-date behavior
- construction BCAR/hand-over/import behavior
- tenure lookup values and unit/cost semantics
- block status and uniqueness rules
- v2 board-report presentation details
- print/export styling and fidelity expectations
