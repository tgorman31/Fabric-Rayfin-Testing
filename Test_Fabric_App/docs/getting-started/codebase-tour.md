# Codebase tour

Use this guide to answer “where should I look?” before changing code. Paths are relative to `Test_Fabric_App/`.

## Where does the application start?

`src/main.tsx` creates the React root, starts authentication through `bootstrapAuth()`, wraps the app in `AuthProvider`, and imports global CSS. `src/App.tsx` owns the browser routes and authentication/access guards.

## Where is routing and navigation defined?

- Routes and redirects: `src/App.tsx`
- Launcher cards and visibility: `src/pages/AppLauncherPage.tsx`
- Sign-in screen: `src/components/AuthPage.tsx` and `src/hooks/AuthContext.tsx`
- Default signed-in destination: `/` redirects to `/project-index` in `src/App.tsx`

## Where is Project Index implemented?

The page is `src/pages/ProjectIndexPage.tsx`. Its service boundary is `src/services/projectIndexService.ts`; programme date operations also use `src/services/programmeService.ts` and `src/services/targetProgrammeService.ts`. The current page implements Project Information, Reporting Programme and the current Target Programme slice. Tenure and Board Report are disabled placeholders.

## Where is Project Register implemented?

The current Register page is `src/pages/HomePage.tsx`. It calls `src/services/projectService.ts` for creation and splits and `src/services/projectHistoryService.ts` for lineage history. The `/project-register` route is guarded by `src/hooks/useProjectRegisterAccess.ts` and `src/domain/projectRegisterAccess.ts`.

## Where are programme components?

Shared timeline pieces are in `src/components/programme/`:

- `TargetProgrammePanel.tsx` and `TargetProgrammeStageWorkspace.tsx` — Target Programme display and stage workspace
- `ProgrammeTimelineHeader.tsx`, `ProgrammeTimelineRow.tsx` and `ProgrammeZoomControls.tsx` — timeline UI

Programme calculations and validation are in `src/domain/programmeRules.ts`, `src/domain/targetProgramme.ts`, `src/domain/targetProgrammeStages.ts`, `src/domain/reportingProgramme.ts` and `src/utils/programmeTimeline.ts`.

## Where are services and data access?

Services in `src/services/` call the Rayfin client and translate records for pages. Key files are `projectIndexService.ts`, `projectService.ts`, `projectHistoryService.ts`, `programmeService.ts`, `targetProgrammeService.ts`, `programmeAdminService.ts` and `rayfinClient.ts`. The client is initialised in `src/services/bootstrap.ts` and `src/services/rayfinClient.ts`.

## Where are Rayfin entities?

Typed entity definitions are in `rayfin/data/`. `rayfin/data/schema.ts` lists the app schema. Identity is represented by `master_site_register` and `master_project_register`; programme configuration includes `programme_item_definition`, `programme_summary_member`, `programme_dependency_definition` and `programme_reporting_mapping`; project data includes `project_index_summary`, `project_programme`, `project_reporting_programme_item`, `project_team_member`, `project_target_stage_status` and `project_target_ddtc_detail`.

## Where are tests?

Tests are under `src/__tests__/`. Relevant examples include `projectProgrammeWorkspace.test.ts`, `programmeRules.test.ts`, `programmeService.test.ts`, `targetProgramme*.test.ts`, `reportingProgramme.test.ts`, `projectRegisterAccess.test.ts`, `programmeAdminRules.test.ts` and `keyedWriteQueue.test.ts`. Run them with `npm run test`.

## Where is Admin/configuration logic?

The screen is `src/pages/AdminPage.tsx`. Access is checked by `src/hooks/useProgrammeAdminAccess.ts`, `src/domain/programmeAdminAuth.ts` and `src/domain/programmeAdminRules.ts`. Data operations and the development bootstrap are in `src/services/programmeAdminService.ts`. The relevant Rayfin role entity is `rayfin/data/app_user_role.ts`.

Programme definitions, summary memberships, dependencies and mappings are intentionally centrally maintained through Programme Admin. A maintainer should not edit TypeScript merely to change a configured row label, ordering or relationship when the Admin metadata is the intended mechanism.

## Where are requirements and decisions?

- Functional/business requirements: `SPEC.md`
- Engineering roadmap and architecture constraints: `IMPLEMENTATION-PLAN.md`
- Confirmed decisions and unresolved questions: `SPEC-QUESTIONNAIRE.md`
- Delivery status: GitHub Issues and pull requests

## Where do I change...?

| Change needed | Start here | Code change or configuration? |
|---|---|---|
| Project Index layout or field interaction | `src/pages/ProjectIndexPage.tsx` | Source code |
| Target Programme visual behaviour | `src/components/programme/` | Source code |
| Target Programme calculations/dependencies | `src/domain/programmeRules.ts`, `src/domain/targetProgramme.ts` | Source code, with tests |
| Target persistence or save status | `src/services/targetProgrammeService.ts`, `src/services/programmeService.ts` | Source code |
| Stage navigation/editability rules | `src/domain/targetProgrammeStages.ts` | Source code, with tests |
| Rayfin entity/table shape | `rayfin/data/` and `rayfin/data/schema.ts` | Schema/entity work; outside this documentation change |
| Centrally maintained programme definitions | `/admin` via `src/pages/AdminPage.tsx` | Programme Admin metadata; do not hard-code it |
| Programme dependencies or Reporting mappings | `/admin` via Programme Admin | Programme Admin metadata; validation remains in source code |
| Project Register create/split/history behaviour | `src/pages/HomePage.tsx` and related services | Source code |
| Functional requirement or product decision | `SPEC.md` / `SPEC-QUESTIONNAIRE.md` through the agreed review process | Canonical documentation/decision process |

## Before changing anything

1. Read the relevant section of [`SPEC.md`](../../SPEC.md).
2. Check [`SPEC-QUESTIONNAIRE.md`](../../SPEC-QUESTIONNAIRE.md) for confirmed decisions and open questions.
3. Check [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md) for sequencing and constraints.
4. Find a nearby test under `src/__tests__/` and add or update focused coverage when behaviour changes.
5. Decide whether the change belongs in UI, a service, domain rules, or Programme Admin metadata.
6. Do not commit `.env.local`, Rayfin generated environment files, credentials or other local secrets.

For the layer relationships, see the [architecture overview](../architecture/architecture-overview.md). For the language patterns used in these files, see [React and TypeScript for this project](../development/react-typescript-for-this-project.md).
