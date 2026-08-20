# Project Register / Project Index Specification

## Purpose

This document defines the agreed scope and direction for evolving the existing Rayfin app into a single application with:

1. a restricted `Project Register` area for project creation, splitting, and lineage management
2. a broader `Project Index` area for project information, programme management, tenure, construction tracking, and administration

This is the cleaned working specification based on the existing app, the user's screenshots, and the confirmed answers captured during the questionnaire pass.

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
- the app should behave more like a **lightweight programme-planning tool** where beneficial
- useful behaviors include:
  - milestones
  - activities
  - planner-style timeline/gantt
  - dependencies/interdependencies
  - stage-based maintenance of active programme sections
- rows with an `End Date` only should be treated as **milestones**
- rows with `Start Date` and `End Date` should be treated as **activities**
- development managers should keep the active `Target Programme` stage current monthly
- users should keep reporting dates current regardless of the active target stage

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
- longer term, that list may be filtered to a user's projects
- if a historical project ref is involved, the user should be able to **choose** what to do

### Top-level tabs

1. `Project Information`
2. `Reporting Programme`
3. `Target Programme`
4. `Tenure`
5. `Board Report` (v2)
6. `Admin`

### Admin

Confirmed direction:
- there should be an `Admin` tab in Project Index
- approved users should be able to maintain dropdown/reference options there

### Shared shell

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
- `project_reporting_programme_item`
- `project_target_programme_item`
- `project_tenure_home`
- `project_tenure_non_resi`
- `project_block_master`
- `project_block_delivery`
- `project_block_tenure`
- admin reference/lookup tables

Construction may require its own delivery-tracker tables depending on implementation detail.

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
- in-app historical retention is not required for now; downstream snapshotting/warehousing will handle history

Remaining open items:
- whether `Staff Username` is free text or resolved from a directory
- whether the same person can appear multiple times in different roles

## 1.4 Facilities

Confirmed correction:
- `Facilities` should **not** exist under `Project Information`
- `Facilities` belongs only under `Tenure`

---

# 2. Reporting Programme

## Overall behavior

Confirmed direction:
- `Reporting Programme` is **hybrid**
- yellow cells from the workbook do not need to be mimicked literally, but the same editable vs derived distinction should exist
- user-editable fields are the workbook's editable/reporting fields
- grey fields are formula-driven and typically derive from lower-level data
- `RAG` and `RAG Comment` should be maintained on the relevant `Target Programme` section and shown here for reference only
- `Mth` is calculated from dates
- `Lvl` is the visibility level of the data point:
  - `B` = Board
  - `E` = Executive
  - `O` = Operational / Business level
  - `P` = Project team
- allowed `RAG` values are `R`, `A`, `G`
- timeline/gantt is required in the first release
- standard programme templates are a good `v2` idea, not required for v1

Remaining open items:
- whether `Gateway`, `Reporting Stage`, and `Sub-Stage` are edited directly here or inherited elsewhere
- whether all rows or only key rows surface reference `RAG`
- whether child rows roll up automatically
- whether gantt bars are visual-only or directly draggable in v1
- whether stage structure varies by project type

---

# 3. Target Programme

## 3.1 Overall behavior

Confirmed direction:
- `Target Programme` is the **operational source of truth**
- `Reporting Programme` does **not** automatically roll up from `Target Programme`
- current milestone/activity names and ordering are still being finalized
- the currently shown rows are the **proposed standard structure** for v1
- users should **not** add custom rows in v1
- row extensibility is a `v2` idea
- date dependency rules are desirable
- the UX should behave more like a modern planning tool than a workbook where helpful

Remaining open items:
- once finalized, whether structures are globally fixed or vary by project type
- whether dependency enforcement is blocking, warning-only, or advisory

## 3.2 Land Activation

Confirmed rules:
- v1 rows are a fixed standard list
- `Partner?` is a dropdown
- `Transferred to Property (# Homes)` is numeric and manual
- `Plot for Disposal (# Homes enabled)` is numeric and manual
- `Total Homes #` is numeric and calculated
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- whether reporting-date rows differ from target-date rows
- what hatched chart segments mean

## 3.3 Site Pipeline

Confirmed rules:
- v1 rows are a fixed standard list
- `Potential Opportunity?` is used to filter the project out of reporting when `Yes`
- `# Homes` is manual
- Gateway rows are a mixture of milestones and summary rows
- some Gateway rows should probably be summaries, exact detail TBD
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- whether users can add extra tasks beyond the default list
- whether the section applies only to certain project types/gateways

## 3.4 Planning

Confirmed rules:
- v1 rows are a fixed standard list
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

Remaining open items:
- whether dependency rules should restrict some dates
- whether Planning should drive any Reporting Programme data automatically

## 3.5 Detailed Design, Tender, Contract

Confirmed rules:
- v1 rows are a fixed standard list
- `Reporting Date` rows visually show dates from `Reporting Programme`
- that reporting-date visual pattern may apply across programme sections
- `Planning Status` values are:
  - `Not Lodged`
  - `Lodged`
  - `Granted`
- v1 should keep one standard structure rather than branching by procurement route/contract type
- longer term, target structure should ideally be driven from another maintained list/configuration source
- section has its own `RAG` and `RAG Comment`

Remaining open items:
- which rows are milestones vs durations
- whether split contracts need different structures
- whether this section feeds Construction directly

## 3.6 Construction

Confirmed direction:
- Construction should remain functionally similar overall, but not identical to the current screenshot implementation
- building blocks should **not** be created in Construction
- blocks should be created in `Tenure > Block Master`
- Construction should behave more like a **separate delivery tracker** than a normal Target Programme stage
- Construction rows should support:
  - a block selected from `Block Master`, or
  - a free-form works item such as `Infrastructure works`
- the screenshot column set is broadly a valid starting point
- the phase model must support significantly more phases than shown in the screenshot
- example raised: a project with **17 phases**
- `RAG` / `RAG Comment` apply **per delivery item row**
- `Construction` should hold the live delivery dates

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
- implement Reporting Programme data model and shell
- implement Target Programme by section
- deliver modern planner-style gantt/timeline in the first release

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

Open items still worth resolving before implementation detail is locked:
- exact code parsing and mandatory base-info rules
- project-team directory behavior and duplicate-person rules
- reporting-programme edit/rollup details
- target-programme dependency behavior and row semantics
- construction BCAR/hand-over/import behavior
- tenure lookup values and unit/cost semantics
- block status and uniqueness rules
- v2 board-report presentation details
- print/export and gantt interaction details
