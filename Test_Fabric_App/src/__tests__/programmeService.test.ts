import { describe, expect, it } from "vitest";

import {
  applyProgrammeDatePatch,
  findDuplicateProjectProgrammeRecord,
  representativeProgrammeDefinitions,
} from "@/services/programmeService";

describe("programme domain foundation", () => {
  it("represents all row types across both programme areas", () => {
    const areas = new Set(
      representativeProgrammeDefinitions.map((definition) => definition.programmeArea),
    );
    const rowTypes = new Set(
      representativeProgrammeDefinitions.map((definition) => definition.rowType),
    );

    expect(areas).toEqual(new Set(["reporting", "target"]));
    expect(rowTypes).toEqual(
      new Set(["activity", "milestone", "summary", "reporting_reference"]),
    );
  });

  it("detects duplicate project and definition instances", () => {
    const records = [
      {
        project_guid: "project-1",
        programme_item_definition_guid: "definition-1",
      },
    ];

    expect(
      findDuplicateProjectProgrammeRecord(records, "project-1", "definition-1"),
    ).toBe(records[0]);
    expect(
      findDuplicateProjectProgrammeRecord(records, "project-1", "definition-2"),
    ).toBeUndefined();
  });

  it("updates only the requested date set fields", () => {
    const current = {
      baseline_start: new Date("2024-01-01T00:00:00"),
      baseline_end: new Date("2024-01-31T00:00:00"),
      target_start: new Date("2025-01-01T00:00:00"),
      target_end: new Date("2025-01-31T00:00:00"),
      reporting_start: undefined,
      reporting_end: undefined,
    };
    const reportingStart = new Date("2026-02-01T00:00:00");

    const updated = applyProgrammeDatePatch(current, {
      reporting_start: reportingStart,
    });

    expect(updated.reporting_start).toBe(reportingStart);
    expect(updated.baseline_start).toBe(current.baseline_start);
    expect(updated.target_end).toBe(current.target_end);
  });
});
