import { describe, expect, it } from "vitest";

import {
  projectTargetProgrammeRows,
  validateDdtcPlanningStatus,
  validateTargetDateWrite,
  validateTargetStageStatus,
} from "@/domain/targetProgramme";
import { buildTargetStageStates } from "@/domain/targetProgrammeStages";

const day = (value: string) => new Date(`${value}T00:00:00`);
const current = buildTargetStageStates("Planning").find((stage) => stage.code === "ddtc")!;
const previous = buildTargetStageStates("Construction").find((stage) => stage.code === "ddtc")!;
const unmapped = buildTargetStageStates("").find((stage) => stage.code === "ddtc")!;

function input(overrides: Partial<Parameters<typeof projectTargetProgrammeRows>[0][number]> = {}) {
  return {
    definition: { guid: "activity", itemCode: "activity", rowLabel: "Activity", rowType: "activity" as const, sortOrder: 2, isEditable: true },
    targetStart: day("2026-04-01"), targetEnd: day("2026-04-05"),
    startControlled: false, endControlled: false, stage: current,
    ...overrides,
  };
}

describe("Target DDTC row projection", () => {
  it("projects configured target/ddtc rows and sorts by order then item code", () => {
    const rows = projectTargetProgrammeRows([
      input({ definition: { guid: "b", itemCode: "b", rowLabel: "B", rowType: "activity", sortOrder: 1, isEditable: true } }),
      input({ definition: { guid: "a", itemCode: "a", rowLabel: "A", rowType: "milestone", sortOrder: 1, isEditable: true }, targetStart: undefined }),
    ]);
    expect(rows.map((row) => row.itemCode)).toEqual(["a", "b"]);
    expect(rows[0].startDate).toBe("");
    expect(rows[0].endDate).toBe("2026-04-05");
  });

  it("projects summary dates as read-only", () => {
    const row = projectTargetProgrammeRows([input({
      definition: { guid: "summary", itemCode: "summary", rowLabel: "Summary", rowType: "summary", sortOrder: 1, isEditable: true },
      targetStart: undefined, targetEnd: undefined, summaryStart: day("2026-03-01"), summaryEnd: day("2026-04-10"),
    })])[0];
    expect(row).toMatchObject({ startDate: "2026-03-01", endDate: "2026-04-10", isStartEditable: false, isEndEditable: false, source: "summary" });
  });

  it("projects explicit reporting references and leaves unmapped references blank", () => {
    const mapped = projectTargetProgrammeRows([input({
      definition: { guid: "ref", itemCode: "ref", rowLabel: "Reference", rowType: "reporting_reference", sortOrder: 1, isEditable: true },
      targetStart: undefined, targetEnd: undefined, reportingReferenceStart: day("2026-05-01"), reportingReferenceEnd: undefined,
    })])[0];
    const blank = projectTargetProgrammeRows([input({
      definition: { guid: "blank", itemCode: "blank", rowLabel: "Blank", rowType: "reporting_reference", sortOrder: 1, isEditable: true },
      targetStart: undefined, targetEnd: undefined,
    })])[0];
    expect(mapped).toMatchObject({ startDate: "2026-05-01", isStartEditable: false, source: "reporting_reference" });
    expect(blank).toMatchObject({ startDate: "", endDate: "", isEndEditable: false });
  });

  it("locks only dependency-controlled fields and disables unsafe moves", () => {
    const row = projectTargetProgrammeRows([input({ startControlled: true, endControlled: false })])[0];
    expect(row).toMatchObject({ isStartEditable: false, isEndEditable: true, isMoveEditable: false });
  });

  it("makes previous and unmapped stages read-only while future stages remain editable", () => {
    expect(projectTargetProgrammeRows([input({ stage: previous })])[0].isEndEditable).toBe(false);
    expect(projectTargetProgrammeRows([input({ stage: unmapped })])[0].isEndEditable).toBe(false);
    expect(projectTargetProgrammeRows([input({ stage: buildTargetStageStates("Planning").find((stage) => stage.code === "construction")! })])[0].isEndEditable).toBe(true);
  });
});

describe("Target DDTC write rules", () => {
  it("rejects milestone Start, summaries/references, locked fields, and invalid ranges", () => {
    expect(() => validateTargetDateWrite({ rowType: "milestone", definitionIsEditable: true, stageIsEditable: true, field: "target_start", controlled: false, value: day("2026-01-01") })).toThrow("Milestones");
    expect(() => validateTargetDateWrite({ rowType: "summary", definitionIsEditable: true, stageIsEditable: true, field: "target_end", controlled: false, value: day("2026-01-01") })).toThrow("activity and milestone");
    expect(() => validateTargetDateWrite({ rowType: "activity", definitionIsEditable: true, stageIsEditable: true, field: "target_start", controlled: true, value: day("2026-01-01") })).toThrow("dependency-controlled");
    expect(() => validateTargetDateWrite({ rowType: "activity", definitionIsEditable: true, stageIsEditable: true, field: "target_end", controlled: false, value: day("2026-01-01"), currentStart: day("2026-02-01") })).toThrow("on or after");
  });

  it("accepts a valid authoritative activity and explicit clearing", () => {
    expect(() => validateTargetDateWrite({ rowType: "activity", definitionIsEditable: true, stageIsEditable: true, field: "target_end", controlled: false, value: null, currentStart: day("2026-02-01") })).not.toThrow();
    expect(() => validateTargetDateWrite({ rowType: "milestone", definitionIsEditable: true, stageIsEditable: true, field: "target_end", controlled: false, value: day("2026-02-01") })).not.toThrow();
  });

  it("validates RAG and Planning Status values", () => {
    for (const value of ["", "R", "A", "G"]) expect(() => validateTargetStageStatus(value)).not.toThrow();
    expect(() => validateTargetStageStatus("X")).toThrow();
    for (const value of ["", "Not Lodged", "Lodged", "Granted"]) expect(() => validateDdtcPlanningStatus(value)).not.toThrow();
    expect(() => validateDdtcPlanningStatus("In Progress")).toThrow();
  });
});
