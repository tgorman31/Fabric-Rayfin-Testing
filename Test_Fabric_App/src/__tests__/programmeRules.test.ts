import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  deriveTargetSummaryDates,
  evaluateTargetDependencies,
  evaluateTargetProgramme,
  resolveReportingMappings,
  validateProgrammeDependencies,
  validateSummaryMemberships,
  type DependencyDefinition,
  type ProgrammeDateRecord,
  type ProgrammeRuleDefinition,
  type ReportingMapping,
  type SummaryMembership,
} from "@/domain/programmeRules";

const date = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

const activity = (guid: string, programmeArea: "reporting" | "target" = "target"): ProgrammeRuleDefinition => ({
  guid,
  programmeArea,
  rowType: "activity",
});
const milestone = (guid: string): ProgrammeRuleDefinition => ({
  guid,
  programmeArea: "target",
  rowType: "milestone",
});
const summary = (guid: string): ProgrammeRuleDefinition => ({
  guid,
  programmeArea: "target",
  rowType: "summary",
});
const reportingSummary = (guid: string): ProgrammeRuleDefinition => ({
  guid,
  programmeArea: "reporting",
  rowType: "summary",
});
const reference = (guid: string): ProgrammeRuleDefinition => ({
  guid,
  programmeArea: "target",
  rowType: "reporting_reference",
});
const member = (guid: string, parent: string, child: string): SummaryMembership => ({
  guid,
  summaryItemDefinitionGuid: parent,
  childItemDefinitionGuid: child,
  sortOrder: 1,
  isActive: true,
});
const dependency = (
  guid: string,
  predecessor: string,
  successor: string,
  successorField: "target_start" | "target_end",
  lagDays = 0,
): DependencyDefinition => ({
  guid,
  predecessorItemDefinitionGuid: predecessor,
  successorItemDefinitionGuid: successor,
  dependencyType: "FS",
  lagDays,
  successorField,
  isActive: true,
});

function record(
  definitionGuid: string,
  dates: Partial<Pick<ProgrammeDateRecord, "targetStart" | "targetEnd" | "reportingStart" | "reportingEnd">>,
): ProgrammeDateRecord {
  return { programmeItemDefinitionGuid: definitionGuid, ...dates };
}

describe("target summary rules", () => {
  it("derives earliest start and latest end, with milestone end as its point date", () => {
    const definitions = [summary("summary"), activity("activity"), milestone("milestone")];
    const dates = deriveTargetSummaryDates(
      definitions,
      [
        record("activity", { targetStart: date(2025, 2, 1), targetEnd: date(2025, 2, 5) }),
        record("milestone", { targetStart: date(2025, 1, 1), targetEnd: date(2025, 2, 10) }),
      ],
      [member("membership-1", "summary", "activity"), member("membership-2", "summary", "milestone")],
    );

    expect(dates.get("summary")).toEqual({
      targetStart: date(2025, 2, 1),
      targetEnd: date(2025, 2, 10),
    });
  });

  it("derives the confirmed Planning nested summary hierarchy", () => {
    const definitions = [
      summary("planning-stage"), summary("kick-off"), summary("riba-2"), summary("riba-3"), summary("planning-period"),
      milestone("appointments"), milestone("brief"), milestone("riba-1"), milestone("design-freeze"), milestone("lrd-pre-app"),
      activity("legal-review"), milestone("planning-lodged"), milestone("planning-decision"), activity("appeal-period"),
    ];
    const dates = deriveTargetSummaryDates(
      definitions,
      [
        record("appointments", { targetEnd: date(2020, 8, 27) }),
        record("brief", { targetEnd: date(2021, 2, 8) }),
        record("riba-1", { targetEnd: date(2021, 12, 8) }),
        record("design-freeze", { targetEnd: date(2022, 2, 8) }),
        record("lrd-pre-app", { targetEnd: date(2022, 4, 8) }),
        record("legal-review", { targetStart: date(2022, 3, 8), targetEnd: date(2022, 4, 8) }),
        record("planning-lodged", { targetEnd: date(2022, 4, 8) }),
        record("planning-decision", { targetEnd: date(2023, 3, 21) }),
        record("appeal-period", { targetStart: date(2023, 3, 21), targetEnd: date(2023, 5, 16) }),
      ],
      [
        member("kick-off-appointments", "kick-off", "appointments"), member("kick-off-brief", "kick-off", "brief"), member("kick-off-riba", "kick-off", "riba-1"),
        member("riba-2-riba", "riba-2", "riba-1"), member("riba-2-freeze", "riba-2", "design-freeze"),
        member("riba-3-freeze", "riba-3", "design-freeze"), member("riba-3-lrd", "riba-3", "lrd-pre-app"), member("riba-3-legal", "riba-3", "legal-review"),
        member("period-lodged", "planning-period", "planning-lodged"), member("period-decision", "planning-period", "planning-decision"), member("period-appeal", "planning-period", "appeal-period"),
        member("stage-kick-off", "planning-stage", "kick-off"), member("stage-riba-2", "planning-stage", "riba-2"), member("stage-riba-3", "planning-stage", "riba-3"), member("stage-period", "planning-stage", "planning-period"),
      ],
    );

    expect(dates.get("kick-off")).toEqual({ targetStart: date(2020, 8, 27), targetEnd: date(2021, 12, 8) });
    expect(dates.get("riba-2")).toEqual({ targetStart: date(2021, 12, 8), targetEnd: date(2022, 2, 8) });
    expect(dates.get("riba-3")).toEqual({ targetStart: date(2022, 2, 8), targetEnd: date(2022, 4, 8) });
    expect(dates.get("planning-period")).toEqual({ targetStart: date(2022, 4, 8), targetEnd: date(2023, 5, 16) });
    expect(dates.get("planning-stage")).toEqual({ targetStart: date(2020, 8, 27), targetEnd: date(2023, 5, 16) });
  });

  it("supports nested summaries and leaves missing dates undefined", () => {
    const definitions = [summary("outer"), summary("inner"), activity("child")];
    const dates = deriveTargetSummaryDates(
      definitions,
      [record("child", { targetEnd: date(2025, 3, 4) })],
      [member("outer-inner", "outer", "inner"), member("inner-child", "inner", "child")],
    );

    expect(dates.get("inner")).toEqual({ targetStart: undefined, targetEnd: date(2025, 3, 4) });
    expect(dates.get("outer")).toEqual({ targetStart: undefined, targetEnd: date(2025, 3, 4) });
  });

  it("does not derive Reporting Programme summaries", () => {
    const dates = deriveTargetSummaryDates(
      [reportingSummary("reporting-summary"), activity("reporting-child", "reporting")],
      [record("reporting-child", { targetStart: date(2025, 2, 1), targetEnd: date(2025, 2, 5) })],
      [member("reporting-membership", "reporting-summary", "reporting-child")],
    );

    expect(dates.has("reporting-summary")).toBe(false);
    expect(dates.size).toBe(0);
  });

  it("rejects cyclic summary membership", () => {
    expect(() => validateSummaryMemberships(
      [summary("a"), summary("b")],
      [member("a-b", "a", "b"), member("b-a", "b", "a")],
    )).toThrow("Summary membership cycle detected");
  });

  it("derives a summary start from a milestone-only child", () => {
    const dates = deriveTargetSummaryDates(
      [summary("summary"), milestone("milestone")],
      [record("milestone", { targetEnd: date(2025, 3, 4) })],
      [member("membership", "summary", "milestone")],
    );
    expect(dates.get("summary")).toEqual({ targetStart: date(2025, 3, 4), targetEnd: date(2025, 3, 4) });
  });
});

describe("target dependency rules", () => {
  it("propagates zero, positive, and negative signed FS lag", () => {
    const definitions = [activity("a"), activity("b")];
    const run = (lagDays: number) => evaluateTargetDependencies(
      definitions,
      [record("a", { targetEnd: date(2025, 4, 10) }), record("b", {})],
      [dependency("dep", "a", "b", "target_start", lagDays)],
    )[1].targetStart;

    expect(run(0)).toEqual(date(2025, 4, 10));
    expect(run(3)).toEqual(date(2025, 4, 13));
    expect(run(-2)).toEqual(date(2025, 4, 8));
  });

  it("propagates chains and preserves activity duration for a start dependency", () => {
    const definitions = [activity("a"), activity("b"), activity("c")];
    const records = [
      record("a", { targetEnd: date(2025, 5, 10) }),
      record("b", { targetStart: date(2025, 5, 1), targetEnd: date(2025, 5, 4) }),
      record("c", {}),
    ];
    const evaluated = evaluateTargetDependencies(
      definitions,
      records,
      [dependency("a-b", "a", "b", "target_start"), dependency("b-c", "b", "c", "target_end")],
    );

    expect(evaluated[1].targetStart).toEqual(date(2025, 5, 10));
    expect(evaluated[1].targetEnd).toEqual(date(2025, 5, 13));
    expect(evaluated[2].targetEnd).toEqual(date(2025, 5, 13));
    expect(records[1].targetStart).toEqual(date(2025, 5, 1));
  });

  it("allows an explicit end dependency to control the end", () => {
    const evaluated = evaluateTargetDependencies(
      [activity("a"), activity("b")],
      [record("a", { targetEnd: date(2025, 6, 10) }), record("b", { targetStart: date(2025, 6, 1), targetEnd: date(2025, 6, 4) })],
      [dependency("a-b-start", "a", "b", "target_start"), dependency("a-b-end", "a", "b", "target_end", 2)],
    );

    expect(evaluated[1].targetStart).toEqual(date(2025, 6, 10));
    expect(evaluated[1].targetEnd).toEqual(date(2025, 6, 12));
  });

  it("propagates the confirmed Planning Decision to Appeal Period", () => {
    const definitions = [milestone("planning-decision"), activity("appeal-period")];
    const records = [
      record("planning-decision", { targetEnd: date(2023, 3, 21) }),
      record("appeal-period", { targetStart: date(2023, 3, 21), targetEnd: date(2023, 5, 16) }),
    ];
    const planningDependency = dependency("planning-decision-appeal", "planning-decision", "appeal-period", "target_start");
    const initial = evaluateTargetDependencies(definitions, records, [planningDependency]);
    expect(initial[1].targetStart).toEqual(date(2023, 3, 21));

    records[0].targetEnd = date(2023, 4, 1);
    const moved = evaluateTargetDependencies(definitions, records, [planningDependency]);
    expect(moved[1].targetStart).toEqual(date(2023, 4, 1));
    expect(moved[1].targetEnd).toEqual(date(2023, 5, 27));
    expect(records[1].targetEnd).toEqual(date(2023, 5, 16));
  });

  it("rejects duplicate controllers, cycles, and invalid endpoints", () => {
    expect(() => validateProgrammeDependencies(
      [activity("a"), activity("b")],
      [dependency("one", "a", "b", "target_end"), dependency("two", "a", "b", "target_end")],
    )).toThrow("Multiple active dependencies");
    expect(() => validateProgrammeDependencies(
      [activity("a"), activity("b")],
      [dependency("a-b", "a", "b", "target_end"), dependency("b-a", "b", "a", "target_end")],
    )).toThrow("Dependency cycle detected");
    expect(() => validateProgrammeDependencies(
      [activity("a"), summary("summary")],
      [dependency("invalid", "a", "summary", "target_end")],
    )).toThrow("activities or milestones");
    expect(() => validateProgrammeDependencies(
      [activity("a"), milestone("milestone")],
      [dependency("invalid-start", "a", "milestone", "target_start")],
    )).toThrow("target_start dependencies require an activity");
    expect(() => validateProgrammeDependencies(
      [activity("a", "reporting"), activity("b")],
      [dependency("wrong-area", "a", "b", "target_end")],
    )).toThrow("target programme");
  });

  it("composes dependency evaluation and summary derivation", () => {
    const result = evaluateTargetProgramme(
      [summary("summary"), activity("a")],
      [record("a", { targetEnd: date(2025, 7, 1) })],
      [],
      [member("membership", "summary", "a")],
    );

    expect(result.effectiveRecords).toBeDefined();
    expect(result.summaryDates.get("summary")?.targetEnd).toEqual(date(2025, 7, 1));
  });
});

describe("reporting mapping rules", () => {
  const definitions = [activity("reporting", "reporting"), activity("target"), reference("reference"), milestone("milestone")];
  const records = [
    record("reporting", { reportingStart: date(2025, 8, 1), reportingEnd: date(2025, 8, 5) }),
    record("target", { targetStart: date(2025, 9, 1), targetEnd: date(2025, 9, 5) }),
  ];

  const mapping = (overrides: Partial<ReportingMapping> = {}): ReportingMapping => ({
    guid: "mapping",
    reportingItemDefinitionGuid: "reporting",
    reportingField: "reporting_start",
    targetItemDefinitionGuid: "target",
    targetField: "target_start",
    ...overrides,
  });

  it("resolves configured fields and optional reference by GUID", () => {
    const result = resolveReportingMappings(definitions, records, [mapping({ reportingReferenceItemDefinitionGuid: "reference" })])[0];
    expect(result.reportingValue).toEqual(date(2025, 8, 1));
    expect(result.targetValue).toEqual(date(2025, 9, 1));
    expect(result.reportingReferenceDefinition?.guid).toBe("reference");

    const end = resolveReportingMappings(definitions, records, [mapping({ reportingField: "reporting_end", targetField: "target_end" })])[0];
    expect(end.reportingValue).toEqual(date(2025, 8, 5));
    expect(end.targetValue).toEqual(date(2025, 9, 5));
  });

  it("uses effective target dates and rejects invalid target mappings", () => {
    const effective = [record("target", { targetStart: date(2025, 10, 1), targetEnd: date(2025, 10, 8) })];
    const result = resolveReportingMappings(definitions, records, [mapping()], effective)[0];
    expect(result.targetValue).toEqual(date(2025, 10, 1));
    expect(() => resolveReportingMappings(
      definitions,
      records,
      [mapping({ targetItemDefinitionGuid: "milestone", targetField: "target_start" })],
    )).toThrow("Milestones cannot provide target_start");
    expect(() => resolveReportingMappings(
      [activity("wrong"), activity("target")],
      records,
      [mapping({ reportingItemDefinitionGuid: "wrong" })],
    )).toThrow("reporting definition must belong to reporting");
    expect(() => resolveReportingMappings(
      [activity("reporting", "reporting"), summary("target")],
      records,
      [mapping({ targetItemDefinitionGuid: "target" })],
    )).toThrow("target must be an activity or milestone");
    expect(() => resolveReportingMappings(
      [activity("reporting", "reporting"), activity("wrong-target", "reporting")],
      records,
      [mapping({ targetItemDefinitionGuid: "wrong-target" })],
    )).toThrow("target definition must belong to target");
    expect(() => resolveReportingMappings(
      definitions,
      records,
      [mapping({ reportingReferenceItemDefinitionGuid: "target" })],
    )).toThrow("reference must be a target reporting_reference");
  });
});

it("adds calendar days without UTC serialization", () => {
  const result = addCalendarDays(date(2025, 12, 31), 1);
  expect(result.getFullYear()).toBe(2026);
  expect(result.getMonth()).toBe(0);
  expect(result.getDate()).toBe(1);
});
