import { describe, expect, it } from "vitest";

import {
  buildTargetDatePatch,
  projectTargetProgrammeRows,
  selectSingleLogicalRecord,
  validateDdtcPlanningStatus,
  validateTargetDateWrite,
  validateTargetStageStatus,
} from "@/domain/targetProgramme";
import { buildTargetStageStates } from "@/domain/targetProgrammeStages";

const day = (value: string) => new Date(`${value}T00:00:00`);
const ddtcCurrent = buildTargetStageStates("Detailed Design / Tender / Contract").find((stage) => stage.code === "ddtc")!;
const ddtcFuture = buildTargetStageStates("Planning").find((stage) => stage.code === "ddtc")!;
const ddtcPrevious = buildTargetStageStates("Construction").find((stage) => stage.code === "ddtc")!;
const ddtcUnmapped = buildTargetStageStates("").find((stage) => stage.code === "ddtc")!;

function input(overrides: Partial<Parameters<typeof projectTargetProgrammeRows>[0][number]> = {}) {
  return {
    definition: { guid: "activity", itemCode: "activity", rowLabel: "Activity", rowType: "activity" as const, sortOrder: 2, isEditable: true },
    targetStart: day("2026-04-01"), targetEnd: day("2026-04-05"),
    startControlled: false, endControlled: false, stage: ddtcFuture,
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

  it("projects every DDTC stage state explicitly", () => {
    expect(ddtcCurrent).toMatchObject({ position: "current", isEditable: true });
    expect(ddtcFuture).toMatchObject({ position: "future", isEditable: true });
    expect(ddtcPrevious).toMatchObject({ position: "previous", isEditable: false });
    expect(ddtcUnmapped).toMatchObject({ position: "unmapped", isEditable: false });
    expect(projectTargetProgrammeRows([input({ stage: ddtcCurrent })])[0].isEndEditable).toBe(true);
    expect(projectTargetProgrammeRows([input({ stage: ddtcFuture })])[0].isEndEditable).toBe(true);
    expect(projectTargetProgrammeRows([input({ stage: ddtcPrevious })])[0].isEndEditable).toBe(false);
    expect(projectTargetProgrammeRows([input({ stage: ddtcUnmapped })])[0].isEndEditable).toBe(false);
  });
});

describe("Target DDTC date patches", () => {
  it("retains both changed values for an atomic whole-bar move", () => {
    expect(buildTargetDatePatch(
      { startDate: "2026-04-01", endDate: "2026-04-05" },
      { startDate: "2026-05-01", endDate: "2026-05-05" },
    )).toEqual({ target_start: "2026-05-01", target_end: "2026-05-05" });
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

  it("rejects duplicate logical stage records instead of selecting one", () => {
    expect(() => selectSingleLogicalRecord([{ id: "one" }, { id: "two" }], "DDTC detail")).toThrow("multiple DDTC detail");
  });

  it("validates RAG and Planning Status values", () => {
    for (const value of ["", "R", "A", "G"]) expect(() => validateTargetStageStatus(value)).not.toThrow();
    expect(() => validateTargetStageStatus("X")).toThrow();
    for (const value of ["", "Not Lodged", "Lodged", "Granted"]) expect(() => validateDdtcPlanningStatus(value)).not.toThrow();
    expect(() => validateDdtcPlanningStatus("In Progress")).toThrow();
  });
});
