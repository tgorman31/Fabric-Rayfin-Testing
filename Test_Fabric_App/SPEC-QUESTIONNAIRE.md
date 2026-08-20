# Project Register / Project Index Questionnaire

This file now acts as a compact decision register and outstanding-question list for the cleaned `SPEC.md`.

---

# Confirmed decisions

## 1. Application structure
- Top-level pages:
  - `Project Register`
  - `Project Index`
- `Project Register` keeps:
  - `Create Project`
  - `Split Project`
  - `Project History`
- `Project Index` is a separate route/page
- Project Index entry is via a **project list**
- Search supports:
  - `project_ref`
  - `site_code`
- Historical refs should let the user **choose** what to do

## 2. Permissions and access
- Long term, Register access should likely use **Entra group** membership
- Initial implementation should use a **role table** in app data
- Unauthorized users should **not see** `Project Register`
- For now, all signed-in users can edit Project Index
- No tab-level read-only split is required for now
- Audit/update history is wanted for edit tables

## 3. First implementation scope
- Desired target is the **full Project Index scope**
- If practical phasing is needed, a narrower first slice is acceptable
- Placeholder tabs may still appear from day one
- `Admin` tab is required for approved users to maintain dropdown/reference values

## 4. Project Information
### Summary/header
- `Project Ref`: read-only
- `Project Name`: editable
- `Gateway`: editable dropdown
- `Reporting Stage`: editable dropdown
- `Sub-Stage`: editable dropdown
- `Project Status`: editable dropdown, manually maintained
- `Reporting Status`: editable dropdown

### Base Info
- `Site Code`, `Planning Code`, `Contract Code`: derived from active project ref
- missing contract code => `null`
- `Phase`: numeric
- `Local Authority`: lookup/dropdown
- `Origin of Land`: lookup/dropdown
- `Project Description`: plain text
- map preview wanted

### Project Team
- `ID`: row number
- `Responsible Manager`: yes/no
- multiple responsible managers allowed
- `Last Reviewed`: auto-maintained
- rows can be added/removed freely
- `Staff Role`: dropdown
- `Team`: dropdown
- history handled downstream rather than in-app

### Facilities
- remove from `Project Information`
- only exists under `Tenure`

## 5. Reporting Programme
- hybrid behavior
- editable vs formula-driven behavior should remain, but without literal Excel yellow cells
- `RAG` / `RAG Comment` live on relevant `Target Programme` sections and appear here for reference
- `Mth` is calculated from dates
- `Lvl` values:
  - `B` = Board
  - `E` = Executive
  - `O` = Operational / Business level
  - `P` = Project team
- allowed `RAG`: `R`, `A`, `G`
- timeline/gantt required in first release
- standard templates are a `v2` idea

## 6. Target Programme
### Cross-cutting direction
- app should evolve beyond Excel limitations where useful
- milestones = end date only
- activities = start + end date
- dependencies/interdependencies are desirable
- development managers should keep the active stage updated monthly
- reporting dates must be kept current regardless of stage

### Overall behavior
- `Target Programme` is the operational source of truth
- `Reporting Programme` does not roll up automatically from it
- current structure is proposed, not fully finalized
- v1 uses provided standard rows
- no custom rows in v1
- row additions are a `v2` feature
- dependency rules are helpful

### Land Activation
- v1 rows fixed
- `Partner?`: dropdown
- `Transferred to Property (# Homes)`: numeric, manual
- `Plot for Disposal (# Homes enabled)`: numeric, manual
- `Total Homes #`: numeric, calculated
- own `RAG` / `RAG Comment`

### Site Pipeline
- v1 rows fixed
- `Potential Opportunity?` filters a project out of reporting when `Yes`
- `# Homes`: manual
- Gateway rows are both milestones and summaries depending on row
- own `RAG` / `RAG Comment`

### Planning
- v1 rows fixed
- `Advancing Gateway 4?`: `Yes`, `No`, `Yes (Partial)`
- `Planning Granted?`: `Yes`, `No`
- `Partial Advance G4: Name` used when only part of project advances
- `Partial Advance G4: # Homes`: manual
- may later be replaced by project split logic
- own `RAG` / `RAG Comment`

### Detailed Design, Tender, Contract
- v1 rows fixed
- `Reporting Date` rows visually show dates from `Reporting Programme`
- `Planning Status`: `Not Lodged`, `Lodged`, `Granted`
- v1 uses one standard structure
- longer term, structure may be driven from another maintained list
- own `RAG` / `RAG Comment`

### Construction
- functionally similar overall, but revised
- blocks are not created here
- blocks are created in `Tenure > Block Master`
- Construction behaves more like a delivery tracker
- rows can reference:
  - a block from `Block Master`
  - or a works item like `Infrastructure works`
- screenshot columns are a good starting point
- must support many phases, e.g. 17
- `RAG` / `RAG Comment` apply per row
- Construction holds live delivery dates

## 7. Tenure
### Overall behavior
- sub-tabs:
  - `Homes`
  - `Non-Resi`
  - `Facilities`
  - `Block Master`
- `Block Master` is the source of truth for blocks
- `Block Master` contains blocks only
- Tenure is both a delivery-definition area and a reporting area
- v1 data is maintained manually in the app
- future feed from Cost Estimate file is possible

### Homes
- derive from selected block:
  - `Phase #`
  - `Phase Start (Reporting)`
  - `Phase End (Reporting)`
  - `Delivery Year (Reporting)`
  - `Block Completion (Target)`
- retained editable fields:
  - `Block Selection`
  - `Tenure`
  - `Home Type`
  - `Home Size`
  - `Qty`
- `Block Selection` from `Block Master`
- one row belongs to one block
- `Qty` manual

### Non-Resi
- same block-derived pattern as Homes
- retained fields run from `Block Selection` through `Qty`
- `Block Selection` from `Block Master`
- key measures are both quantity and area
- `Unit Type` / category values come from `Admin`

### Facilities
- captures site-based facilities items such as car park spaces
- need car park spaces by at least:
  - resi
  - non-resi
- ideally by tenure type too
- `Block Selection` likely workable
- key measure is quantity
- facility types come from `Admin`

### Block Master
- underlying split expected to be:
  - `Block Master`
  - `Block Delivery`
  - `Block Tenure`
- `Block Master` fields include at least:
  - `GUID`
  - `ProjectGUID`
  - `Name`
  - `Block Ref`
  - `Status`
- `Block Delivery` includes at least:
  - `GUID`
  - `Block GUID`
  - `Phase #`
  - `Start Date`
  - `Completion Date`
  - `Effective From`
  - `Effective To`
- `Block Tenure` includes at least:
  - `GUID`
  - `Block GUID`
  - `Tenure`
  - `Home Type`
  - `Home Size`
  - `Qty`
  - `Effective From`
  - `Effective To`
- each block belongs to one phase
- `Block Ref` is manual
- history handled through warehousing
- `Block Master` defines identity only
- Construction holds live delivery dates

## 8. Board Report
- move to `v2`
- likely long-term solution is **Power BI**
- current board-report sections include:
  - `Summary`
  - `Health & Safety`
  - `Commercial`
  - `Monthly Progress`
- current outputs should be printable/exportable
- longer term, prefer summarized web view and/or Power BI
- snapshotting should allow board outputs to be derived
- separate historical board-report storage likely not required if snapshotting handles history

## 9. UX and visual fidelity
- prioritize close visual match to screenshots
- do not literally mimic yellow Excel cells
- use standard web UI indicators for editability
- timeline/gantt should be modern planner-style
- primary brand colors:
  - Dark Green: `#025437`
  - Middle Green: `#006838`
  - Light Green: `#8fb73e`
  - Black: `#000000`
  - Medium Grey: `#5a5a5a`
  - White: `#ffffff`
- `Target Programme` stage colors can approximate the screenshot palette
- reporting-date rows should use complementary opposite colors
- optimize for mixed usage

---

# Outstanding questions

## Project Information
- exact parsing rule for planning/contract codes
- are `Site Name` and `Public Name` both mandatory?
- should `Staff Username` be free text or directory-backed?
- can the same person appear multiple times in different roles?

## Reporting Programme
- are `Gateway`, `Reporting Stage`, and `Sub-Stage` edited here or elsewhere?
- do all rows or only key rows surface `RAG`?
- do child rows roll up automatically?
- should gantt bars be draggable in v1?
- does stage structure vary by project type?

## Target Programme
- globally fixed stage structure vs project-type variants
- blocking vs warning-only dependencies
- meaning of hatched chart styling
- whether extra tasks can be added in Site Pipeline later
- whether Planning drives Reporting Programme automatically
- milestone vs duration definitions for DDTC
- split-contract behavior
- Construction BCAR/hand-over/import behavior

## Tenure
- Homes lookup values for `Tenure`, `Home Type`, `Home Size`
- Non-Resi cost/value semantics and totals
- whether Facilities explicitly stores tenure type and block-derived dates
- Block Master statuses and uniqueness rules

## Board Report / UX
- future board-report editable vs generated split
- future board-report export format priority
- print/export visual fidelity expectations
- v1 gantt drag/drop vs visual-first behavior
