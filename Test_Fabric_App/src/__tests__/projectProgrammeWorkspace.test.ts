import { describe, expect, it } from "vitest";

import { buildTargetDatePatch } from "@/domain/targetProgramme";
import { evaluateTargetProgramme } from "@/domain/programmeRules";
import {
  projectReportingProgrammeRows,
  projectTargetProgrammeStageWorkspace,
  type ProjectProgrammeClientState,
} from "@/services/targetProgrammeService";

const date = (value: string) => new Date(`${value}T00:00:00`);
const definition = (guid: string, area: "target" | "reporting", rowType: string, itemCode = guid, sortOrder = 1) => ({
  id: guid, guid, item_code: itemCode, programme_area: area, stage_code: area === "target" ? "ddtc" : "planning",
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
