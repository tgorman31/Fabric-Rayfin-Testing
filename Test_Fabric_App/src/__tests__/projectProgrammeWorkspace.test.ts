import { describe, expect, it } from "vitest";

import { buildTargetDatePatch } from "@/domain/targetProgramme";
import { evaluateTargetProgramme } from "@/domain/programmeRules";
import {
  isImplementedTargetOperationalDefinition,
  isImplementedTargetStage,
  projectReportingProgrammeRows,
  projectTargetProgrammeStageWorkspace,
  shouldInitializeImplementedTarget,
  validateTargetPlanningDetailPatch,
  type ProjectProgrammeClientState,
} from "@/services/targetProgrammeService";

const date = (value: string) => new Date(`${value}T00:00:00`);
const definition = (guid: string, area: "target" | "reporting", rowType: string, itemCode = guid, sortOrder = 1, stageCode = area === "target" ? "ddtc" : "planning") => ({
  id: guid, guid, item_code: itemCode, programme_area: area, stage_code: stageCode,
  row_label: itemCode === guid ? `Label ${guid}` : itemCode, row_type: rowType, sort_order: sortOrder,
  level_code: "O", is_active: true, is_editable: true, is_derived: false,
  effective_from: date("2026-01-01"), effective_to: undefined,
});
const record = (guid: string, dates: { targetStart?: string; targetEnd?: string; reportingStart?: string; reportingEnd?: string } = {}) => ({
  id: `${guid}-record`, guid: `${guid}-record`, project_guid: "project", programme_item_definition_guid: guid,
  baseline_start: undefined, baseline_end: undefined,
  target_start: dates.targetStart ? date(dates.targetStart) : undefined,
  target_end: dates.targetEnd ? date(dates.targetEnd) : undefined,
  reporting_start: dates.reportingStart ? date(dates.reportingStart) : undefined,
  reporting_end: dates.reportingEnd ? date(dates.reportingEnd) : undefined,
  created_at: date("2026-01-01"), created_by_user_id: "user", created_by_user_email: "user@example.test",
  updated_at: date("2026-01-01"), updated_by_user_id: "user", updated_by_user_email: "user@example.test",
});
const status = { id: "status", guid: "status", project_guid: "project", stage_code: "ddtc", rag_code: undefined, rag_comment: undefined, created_at: date("2026-01-01"), created_by_user_id: "u", created_by_user_email: "u@test", updated_at: date("2026-01-01"), updated_by_user_id: "u", updated_by_user_email: "u@test" };
const state = (overrides: Partial<ProjectProgrammeClientState>): ProjectProgrammeClientState => ({
  definitions: [], records: [], summaryMembers: [], dependencies: [], reportingMappings: [], stageStatuses: [status], ddtcDetail: undefined, ...overrides,
} as ProjectProgrammeClientState);

describe("project programme working-copy projections", () => {
  it("projects both implemented Planning and DDTC stages", () => {
    expect(isImplementedTargetStage("ddtc")).toBe(true);
    expect(isImplementedTargetStage("planning")).toBe(true);
    expect(isImplementedTargetStage("land-activation")).toBe(false);
    expect(projectTargetProgrammeStageWorkspace(state({ stageStatuses: [] }), "Planning", "planning").stageStatus).toBeUndefined();
  });

  it("initializes only active projects and tolerates missing historical DDTC metadata", () => {
    expect(shouldInitializeImplementedTarget(date("2099-12-31"))).toBe(true);
    expect(shouldInitializeImplementedTarget(date("2026-01-01"))).toBe(false);
    const historical = projectTargetProgrammeStageWorkspace(state({ stageStatuses: [], ddtcDetail: undefined }), "Construction", "ddtc");
    expect(historical.stageStatus).toBeUndefined();
    expect(historical.ddtcDetail).toBeUndefined();
  });

  it("keeps DDTC editable only for active projects", () => {
    const activity = definition("activity", "target", "activity");
    const programme = state({ definitions: [activity] as never[], records: [record("activity", { targetStart: "2026-06-01", targetEnd: "2026-06-30" })] as never[] });
    const activeCurrent = projectTargetProgrammeStageWorkspace(programme, "Detailed Design / Tender / Contract", "ddtc", { projectIsEditable: true });
    const activeFuture = projectTargetProgrammeStageWorkspace(programme, "Planning", "ddtc", { projectIsEditable: true });
    const historicalCurrent = projectTargetProgrammeStageWorkspace(programme, "Detailed Design / Tender / Contract", "ddtc", { projectIsEditable: false });
    const historicalFuture = projectTargetProgrammeStageWorkspace(programme, "Planning", "ddtc", { projectIsEditable: false });

    expect(activeCurrent.stage.position).toBe("current");
    expect(activeCurrent.rows[0]).toMatchObject({ isStartEditable: true, isEndEditable: true, isMoveEditable: true });
    expect(activeFuture.stage.position).toBe("future");
    expect(activeFuture.rows[0]).toMatchObject({ isStartEditable: true, isEndEditable: true, isMoveEditable: true });
    expect(historicalCurrent.stage.position).toBe("current");
    expect(historicalCurrent.rows[0]).toMatchObject({ isStartEditable: false, isEndEditable: false, isMoveEditable: false });
    expect(historicalFuture.stage.position).toBe("future");
    expect(historicalFuture.rows[0]).toMatchObject({ isStartEditable: false, isEndEditable: false, isMoveEditable: false });
  });

  it("projects active Planning definitions using the shared workspace", () => {
    const planningActivity = definition("planning-activity", "target", "activity", "planning-activity", 2, "planning");
    const planningMilestone = definition("planning-milestone", "target", "milestone", "planning-milestone", 1, "planning");
    const ddtcActivity = definition("ddtc-activity", "target", "activity");
    const view = projectTargetProgrammeStageWorkspace(state({ definitions: [planningActivity, planningMilestone, ddtcActivity] as never[], records: [record("planning-activity", { targetStart: "2026-06-01", targetEnd: "2026-06-30" }), record("planning-milestone", { targetEnd: "2026-07-01" }), record("ddtc-activity", { targetEnd: "2026-08-01" })] as never[] }), "Planning", "planning");
    expect(view.rows.map((row) => row.itemCode)).toEqual(["planning-milestone", "planning-activity"]);
  });

  it("validates Planning detail options and optional homes", () => {
    for (const value of ["", "Yes", "No", "Yes (Partial)"]) expect(() => validateTargetPlanningDetailPatch({ advancingGateway4Code: value })).not.toThrow();
    for (const value of ["", "Yes", "No"]) expect(() => validateTargetPlanningDetailPatch({ planningGrantedCode: value })).not.toThrow();
    expect(() => validateTargetPlanningDetailPatch({ advancingGateway4Code: "Maybe" })).toThrow();
    expect(() => validateTargetPlanningDetailPatch({ planningGrantedCode: "Pending" })).toThrow();
    expect(() => validateTargetPlanningDetailPatch({ partialAdvanceG4Homes: 0 })).not.toThrow();
    expect(() => validateTargetPlanningDetailPatch({ partialAdvanceG4Homes: null })).not.toThrow();
    expect(() => validateTargetPlanningDetailPatch({ partialAdvanceG4Homes: -1 })).toThrow();
    expect(() => validateTargetPlanningDetailPatch({ partialAdvanceG4Homes: 1.5 })).toThrow();
  });

  it("initializes operational records only for active Planning and DDTC definitions", () => {
    expect(isImplementedTargetOperationalDefinition({ programme_area: "target", stage_code: "ddtc", row_type: "activity" })).toBe(true);
    expect(isImplementedTargetOperationalDefinition({ programme_area: "target", stage_code: "ddtc", row_type: "milestone" })).toBe(true);
    expect(isImplementedTargetOperationalDefinition({ programme_area: "target", stage_code: "planning", row_type: "activity" })).toBe(true);
    expect(isImplementedTargetOperationalDefinition({ programme_area: "target", stage_code: "construction", row_type: "milestone" })).toBe(false);
    expect(isImplementedTargetOperationalDefinition({ programme_area: "target", stage_code: "ddtc", row_type: "summary" })).toBe(false);
  });
  it("projects Planning current, future, previous, and historical editability", () => {
    const activity = definition("planning-activity", "target", "activity", "planning-activity", 1, "planning");
    const programme = state({ definitions: [activity] as never[], records: [record("planning-activity", { targetStart: "2026-06-01", targetEnd: "2026-06-30" })] as never[] });
    const current = projectTargetProgrammeStageWorkspace(programme, "Planning", "planning", { projectIsEditable: true });
    const future = projectTargetProgrammeStageWorkspace(programme, "Site Pipeline", "planning", { projectIsEditable: true });
    const previous = projectTargetProgrammeStageWorkspace(programme, "Detailed Design / Tender / Contract", "planning", { projectIsEditable: true });
    const historical = projectTargetProgrammeStageWorkspace(programme, "Planning", "planning", { projectIsEditable: false });
    expect(current.rows[0]).toMatchObject({ isStartEditable: true, isEndEditable: true, isMoveEditable: true });
    expect(future.rows[0]).toMatchObject({ isStartEditable: true, isEndEditable: true, isMoveEditable: true });
    expect(previous.rows[0]).toMatchObject({ isStartEditable: false, isEndEditable: false, isMoveEditable: false });
    expect(historical.rows[0]).toMatchObject({ isStartEditable: false, isEndEditable: false, isMoveEditable: false });
  });

  it("updates Planning summary dates immediately from local state", () => {
    const child = definition("planning-child", "target", "activity", "planning-child", 1, "planning");
    const summary = definition("planning-summary", "target", "summary", "planning-summary", 2, "planning");
    const programme = state({ definitions: [child, summary] as never[], records: [record("planning-child", { targetEnd: "2026-06-30" })] as never[], summaryMembers: [{ guid: "member", summary_item_definition_guid: "planning-summary", child_item_definition_guid: "planning-child", sort_order: 1, is_active: true }] as never[] });
    const patched = { ...programme, records: [record("planning-child", { targetEnd: "2026-07-31" })] } as ProjectProgrammeClientState;
    const view = projectTargetProgrammeStageWorkspace(patched, "Planning", "planning", { projectIsEditable: true });
    expect(view.rows.find((row) => row.definitionGuid === "planning-summary")?.endDate).toBe("2026-07-31");
  });

  it("projects Planning dependency-effective dates and locks the controlled field", () => {
    const predecessor = definition("planning-predecessor", "target", "activity", "planning-predecessor", 1, "planning");
    const successor = definition("planning-successor", "target", "activity", "planning-successor", 2, "planning");
    const programme = state({ definitions: [predecessor, successor] as never[], records: [record("planning-predecessor", { targetEnd: "2026-06-30" }), record("planning-successor", { targetEnd: "2026-07-05" })] as never[], dependencies: [{ guid: "planning-dependency", predecessor_item_definition_guid: "planning-predecessor", successor_item_definition_guid: "planning-successor", dependency_type: "FS", lag_days: 0, successor_field: "target_end", is_active: true, effective_from: date("2026-01-01"), effective_to: undefined }] as never[] });
    const view = projectTargetProgrammeStageWorkspace(programme, "Planning", "planning", { projectIsEditable: true });
    expect(view.rows.find((row) => row.definitionGuid === "planning-successor")).toMatchObject({ endDate: "2026-06-30", isEndEditable: false });
  });

  it("projects Planning Reporting references from explicit mappings", () => {
    const reporting = definition("planning-reporting", "reporting", "activity", "planning-reporting");
    const target = definition("planning-target", "target", "activity", "planning-target", 1, "planning");
    const reference = definition("planning-reference", "target", "reporting_reference", "planning-reference", 2, "planning");
    const programme = state({ definitions: [reporting, target, reference] as never[], records: [record("planning-reporting", { reportingEnd: "2026-06-30" })] as never[], reportingMappings: [{ guid: "planning-mapping", reporting_item_definition_guid: "planning-reporting", reporting_field: "reporting_end", target_item_definition_guid: "planning-target", target_field: "target_end", reporting_reference_item_definition_guid: "planning-reference", is_active: true, effective_from: date("2026-01-01"), effective_to: undefined }] as never[] });
    const view = projectTargetProgrammeStageWorkspace(programme, "Planning", "planning", { projectIsEditable: true });
    expect(view.rows.find((row) => row.definitionGuid === "planning-reference")).toMatchObject({ endDate: "2026-06-30", isEndEditable: false });
  });

  it("updates summary dates immediately from a local activity end patch", () => {
    const activity = definition("activity", "target", "activity");
    const summary = definition("summary", "target", "summary", "summary", 2);
    const programme = state({ definitions: [activity, summary] as never[], records: [record("activity", { targetStart: "2026-06-01", targetEnd: "2026-06-30" })] as never[], summaryMembers: [{ guid: "member", summary_item_definition_guid: "summary", child_item_definition_guid: "activity", sort_order: 1, is_active: true }] as never[] });
    const patched = { ...programme, records: [record("activity", { targetStart: "2026-06-01", targetEnd: "2026-07-31" })] } as ProjectProgrammeClientState;
    const view = projectTargetProgrammeStageWorkspace(patched, "Detailed Design / Tender / Contract", "ddtc");
    const direct = evaluateTargetProgramme(
      patched.definitions.map((item) => ({ guid: item.guid, programmeArea: item.programme_area as "target", rowType: item.row_type as "activity" | "summary" })),
      patched.records.map((item) => ({ programmeItemDefinitionGuid: item.programme_item_definition_guid, targetStart: item.target_start, targetEnd: item.target_end })),
      [],
      patched.summaryMembers.map((member) => ({ guid: member.guid, summaryItemDefinitionGuid: member.summary_item_definition_guid, childItemDefinitionGuid: member.child_item_definition_guid, sortOrder: member.sort_order, isActive: member.is_active })) as never[],
    );
    expect(direct.summaryDates.get("summary")?.targetEnd).toEqual(date("2026-07-31"));

    expect(view.rows.find((row) => row.definitionGuid === "summary")?.endDate).toBe("2026-07-31");
  });

  it("updates dependency-effective successor dates from local predecessor state", () => {
    const predecessor = definition("predecessor", "target", "activity");
    const successor = definition("successor", "target", "activity", "successor", 2);
    const programme = state({ definitions: [predecessor, successor] as never[], records: [record("predecessor", { targetEnd: "2026-06-30" }), record("successor", { targetStart: "2026-07-01", targetEnd: "2026-07-05" })] as never[], dependencies: [{ guid: "dependency", predecessor_item_definition_guid: "predecessor", successor_item_definition_guid: "successor", dependency_type: "FS", lag_days: 0, successor_field: "target_end", is_active: true, effective_from: date("2026-01-01"), effective_to: undefined }] as never[] });
    const patched = { ...programme, records: [record("predecessor", { targetEnd: "2026-07-31" }), record("successor", { targetStart: "2026-07-01", targetEnd: "2026-07-05" })] as never[] };
    const view = projectTargetProgrammeStageWorkspace(patched, "Detailed Design / Tender / Contract", "ddtc");
    expect(view.rows.find((row) => row.definitionGuid === "successor")?.endDate).toBe("2026-07-31");
  });

  it("keeps derived values out of the authoritative patch", () => {
    expect(buildTargetDatePatch({ startDate: "2026-06-01", endDate: "2026-06-30" }, { startDate: "2026-06-01", endDate: "2026-07-31" })).toEqual({ target_end: "2026-07-31" });
  });

  it("updates mapped reporting references from canonical Reporting records", () => {
    const reporting = definition("reporting", "reporting", "activity", "reporting-code");
    const target = definition("target", "target", "activity", "target-code");
    const reference = definition("reference", "target", "reporting_reference", "reference-code", 2);
    const programme = state({ definitions: [reporting, target, reference] as never[], records: [record("reporting", { reportingEnd: "2026-06-30" })] as never[], reportingMappings: [{ guid: "mapping", reporting_item_definition_guid: "reporting", reporting_field: "reporting_end", target_item_definition_guid: "target", target_field: "target_end", reporting_reference_item_definition_guid: "reference", is_active: true, effective_from: date("2026-01-01"), effective_to: undefined }] as never[] });
    const view = projectTargetProgrammeStageWorkspace(programme, "Detailed Design / Tender / Contract", "ddtc");
    expect(view.rows.find((row) => row.definitionGuid === "reference")?.endDate).toBe("2026-06-30");

    const rows = projectReportingProgrammeRows(programme);
    expect(rows[0]).toMatchObject({ rowCode: "reporting-code", rowLabel: "reporting-code", endDate: "2026-06-30" });
  });
});
