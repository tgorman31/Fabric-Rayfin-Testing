import { describe, expect, it } from "vitest";

import {
  buildReportingMigrationPlan,
  buildReportingDatePatch,
  isCompatibleReportingDefinition,
  requiresReportingMigration,
  mapCanonicalReportingView,
  REPORTING_COMPATIBILITY_DEFINITIONS,
  REPORTING_COMPATIBILITY_STAGE_ORDER,
  sortReportingDefinitions,
} from "@/domain/reportingProgramme";
import type { ProgrammeDefinitionRecord, ProjectProgrammeRecord } from "@/services/programmeService";

const date = (year: number, month: number, day: number) => new Date(year, month - 1, day);

const definition = (overrides: Partial<ProgrammeDefinitionRecord> = {}): ProgrammeDefinitionRecord => ({
  id: "record-id",
  guid: "definition-guid",
  item_code: "item-code",
  programme_area: "reporting",
  stage_code: "planning",
  row_label: "Configured label",
  row_type: "activity",
  sort_order: 1,
  level_code: "O",
  is_active: true,
  is_editable: true,
  is_derived: false,
  effective_from: date(2026, 1, 1),
  effective_to: undefined,
  ...overrides,
});

const programmeRecord = (overrides: Partial<ProjectProgrammeRecord> = {}): ProjectProgrammeRecord => ({
  id: "project-record-id",
  guid: "project-record-guid",
  project_guid: "project-guid",
  programme_item_definition_guid: "definition-guid",
  baseline_start: undefined,
  baseline_end: undefined,
  target_start: undefined,
  target_end: undefined,
  reporting_start: undefined,
  reporting_end: undefined,
  created_at: date(2026, 1, 1),
  created_by_user_id: "user",
  created_by_user_email: "user@example.test",
  updated_at: date(2026, 1, 1),
  updated_by_user_id: "user",
  updated_by_user_email: "user@example.test",
  ...overrides,
});

describe("Reporting compatibility catalogue", () => {
  it("accepts Admin-maintained mutable metadata without changing identity", () => {
    const expected = REPORTING_COMPATIBILITY_DEFINITIONS[0];
    expect(isCompatibleReportingDefinition({
      guid: expected.guid,
      item_code: expected.itemCode,
      programme_area: "reporting",
      stage_code: expected.stageCode,
      row_type: "activity",
      is_derived: false,
      is_active: false,
    }, expected)).toBe(true);
  });

  it("preserves exact row codes and five-stage order", () => {
    expect(REPORTING_COMPATIBILITY_DEFINITIONS).toHaveLength(15);
    expect(new Set(REPORTING_COMPATIBILITY_DEFINITIONS.map((item) => item.itemCode)).size).toBe(15);
    expect(REPORTING_COMPATIBILITY_DEFINITIONS.map((item) => item.stageCode)).toEqual([
      "land-activation", "land-activation", "land-activation",
      "site-pipeline", "site-pipeline", "site-pipeline",
      "planning", "planning", "planning",
      "ddtc", "ddtc", "ddtc",
      "construction", "construction", "construction",
    ]);
    expect(REPORTING_COMPATIBILITY_STAGE_ORDER).toEqual([
      "land-activation", "site-pipeline", "planning", "ddtc", "construction",
    ]);
    expect(REPORTING_COMPATIBILITY_DEFINITIONS.map((item) => item.itemCode)).toEqual([
      "la-opportunity", "la-agreement", "la-transfer", "sp-g1", "sp-g2", "sp-homes",
      "pl-preapp", "pl-submit", "pl-granted", "ddtc-design", "ddtc-tender", "ddtc-contract",
      "co-start", "co-mid", "co-complete",
    ]);
  });
});

describe("Reporting legacy migration", () => {
  const catalogue = [
    { ...REPORTING_COMPATIBILITY_DEFINITIONS[0] },
    { ...REPORTING_COMPATIBILITY_DEFINITIONS[1] },
  ];

  it("matches by row code and migrates start/end", () => {
    const plan = buildReportingMigrationPlan(catalogue, [
      { row_code: catalogue[0].itemCode, row_label: "Different label", start_date: date(2026, 2, 1), end_date: date(2026, 2, 4) },
    ], []);
    expect(plan[0]).toMatchObject({ create: true, reportingStart: date(2026, 2, 1), reportingEnd: date(2026, 2, 4) });
    expect(plan[1]).toMatchObject({ create: true, reportingStart: undefined, reportingEnd: undefined });
  });

  it("rejects unknown legacy row codes", () => {
    expect(() => buildReportingMigrationPlan(catalogue, [{ row_code: "wrong-label-row" }], [])).toThrow("not in the compatibility catalogue");
  });

  it("checks migration only for missing active compatibility records", () => {
    const definitions = [
      { ...REPORTING_COMPATIBILITY_DEFINITIONS[0] },
      { ...REPORTING_COMPATIBILITY_DEFINITIONS[1] },
    ];
    expect(requiresReportingMigration(definitions, [
      { guid: definitions[0].guid, is_active: true },
      { guid: definitions[1].guid, is_active: false },
    ], [{ programme_item_definition_guid: definitions[0].guid }])).toBe(false);
    expect(requiresReportingMigration(definitions, [
      { guid: definitions[0].guid, is_active: true },
      { guid: definitions[1].guid, is_active: true },
    ], [{ programme_item_definition_guid: definitions[0].guid }])).toBe(true);
  });

  it("leaves existing canonical records authoritative and makes retry a no-op", () => {
    const existing = { programme_item_definition_guid: catalogue[0].guid, reporting_start: undefined, reporting_end: undefined };
    const first = buildReportingMigrationPlan(catalogue, [
      { row_code: catalogue[0].itemCode, start_date: date(2026, 2, 1) },
    ], [existing]);
    expect(first[0]).toEqual({ definitionGuid: catalogue[0].guid, itemCode: catalogue[0].itemCode, create: false });
    const retry = buildReportingMigrationPlan(catalogue, [], [existing]);
    expect(retry[0].create).toBe(false);
  });
});

describe("canonical Reporting view", () => {
  it("maps active definition metadata and canonical dates", () => {
    const item = mapCanonicalReportingView(
      definition({ guid: "definition-guid", item_code: "admin-code", stage_code: "planning" }),
      programmeRecord({ reporting_start: date(2026, 3, 1), reporting_end: date(2026, 3, 5) }),
    );
    expect(item).toMatchObject({
      rowCode: "admin-code",
      rowLabel: "Configured label",
      sectionCode: "planning",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
    });
  });

  it("supports independent canonical date fields and explicit clearing", () => {
    const start = buildReportingDatePatch({ startDate: "2026-04-01" });
    expect(start).toEqual({ reporting_start: date(2026, 4, 1) });
    expect(buildReportingDatePatch({ endDate: "" })).toEqual({ reporting_end: null });
    expect(buildReportingDatePatch({ startDate: "" })).not.toHaveProperty("reporting_end");
  });

  it("keeps fixed section order despite conflicting row sort orders", () => {
    const definitions = [
      { stage_code: "planning", sort_order: 1, item_code: "planning-first" },
      { stage_code: "land-activation", sort_order: 99, item_code: "land-last" },
      { stage_code: "future-stage", sort_order: 1, item_code: "future" },
    ];
    expect(sortReportingDefinitions(definitions).map((item) => item.stage_code)).toEqual([
      "land-activation", "planning", "future-stage",
    ]);
  });
});
