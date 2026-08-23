import { describe, expect, it } from "vitest";

import {
  buildTargetStageStates,
  resolveTargetStageCode,
  TARGET_PROGRAMME_STAGES,
} from "@/domain/targetProgrammeStages";

const stageCodes = (reportingStage: string) =>
  buildTargetStageStates(reportingStage).map((stage) => [
    stage.code,
    stage.position,
    stage.isEditable,
  ]);

describe("Target Programme stage configuration", () => {
  it("uses the explicit Reporting Stage mappings", () => {
    expect(resolveTargetStageCode("Land Activation")).toBe("land-activation");
    expect(resolveTargetStageCode("Site Pipeline")).toBe("site-pipeline");
    expect(resolveTargetStageCode("Planning")).toBe("planning");
    expect(resolveTargetStageCode("Detailed Design / Tender / Contract")).toBe("ddtc");
    expect(resolveTargetStageCode("Construction")).toBe("construction");
  });

  it("keeps the exact Target stage order", () => {
    expect(TARGET_PROGRAMME_STAGES.map((stage) => stage.code)).toEqual([
      "land-activation",
      "site-pipeline",
      "planning",
      "ddtc",
      "construction",
    ]);
  });

  it("calculates Land Activation as current and later stages as future", () => {
    expect(stageCodes("Land Activation")).toEqual([
      ["land-activation", "current", true],
      ["site-pipeline", "future", true],
      ["planning", "future", true],
      ["ddtc", "future", true],
      ["construction", "future", true],
    ]);
  });

  it("calculates Planning as current with earlier stages read-only", () => {
    expect(stageCodes("Planning")).toEqual([
      ["land-activation", "previous", false],
      ["site-pipeline", "previous", false],
      ["planning", "current", true],
      ["ddtc", "future", true],
      ["construction", "future", true],
    ]);
  });

  it("calculates Construction as current", () => {
    expect(stageCodes("Construction")).toEqual([
      ["land-activation", "previous", false],
      ["site-pipeline", "previous", false],
      ["planning", "previous", false],
      ["ddtc", "previous", false],
      ["construction", "current", true],
    ]);
  });

  it("recalculates backwards movement without persisted lock state", () => {
    const afterConstruction = buildTargetStageStates("Construction");
    const afterSitePipeline = buildTargetStageStates("Site Pipeline");

    expect(afterConstruction.find((stage) => stage.code === "planning")?.isEditable).toBe(false);
    expect(afterSitePipeline).toEqual([
      expect.objectContaining({ code: "land-activation", position: "previous", isEditable: false }),
      expect.objectContaining({ code: "site-pipeline", position: "current", isEditable: true }),
      expect.objectContaining({ code: "planning", position: "future", isEditable: true }),
      expect.objectContaining({ code: "ddtc", position: "future", isEditable: true }),
      expect.objectContaining({ code: "construction", position: "future", isEditable: true }),
    ]);
  });

  it("makes blank and unknown Reporting Stages unmapped and read-only", () => {
    for (const reportingStage of ["", "Not a configured stage", "Detailed Design Tender Contract"]) {
      expect(resolveTargetStageCode(reportingStage)).toBeUndefined();
      expect(buildTargetStageStates(reportingStage).every((stage) => !stage.isEditable)).toBe(true);
      expect(buildTargetStageStates(reportingStage).some((stage) => stage.position === "current")).toBe(false);
    }
  });
});
