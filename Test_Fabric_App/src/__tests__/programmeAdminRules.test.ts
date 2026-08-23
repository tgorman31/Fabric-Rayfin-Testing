import { describe, expect, it } from "vitest";

import {
  isProgrammeAdminBootstrapEligible,
  normalizeProgrammeAdminEmail,
} from "@/domain/programmeAdminAuth";
import {
  isProgrammeAdminRoleEffective,
  validateDefinitionCandidate,
  validateProgrammeConfiguration,
  type AdminDefinition,
} from "@/domain/programmeAdminRules";

const definition = (overrides: Partial<AdminDefinition> = {}): AdminDefinition => ({
  guid: "definition",
  itemCode: "definition.code",
  programmeArea: "target",
  stageCode: "planning",
  rowLabel: "Definition",
  rowType: "activity",
  sortOrder: 0,
  levelCode: "",
  isEditable: true,
  isDerived: false,
  ...overrides,
});

const config = (overrides: Partial<Parameters<typeof validateProgrammeConfiguration>[0]> = {}) => ({
  definitions: [definition()],
  summaryMemberships: [],
  dependencies: [],
  reportingMappings: [],
  ...overrides,
});

describe("programme Admin definition rules", () => {
  it("rejects item_code mutation and invalid row semantics", () => {
    expect(() => validateDefinitionCandidate(definition({ itemCode: "new.code" }), definition())).toThrow("item_code cannot be changed");
    expect(() => validateDefinitionCandidate(definition({ rowType: "summary", isEditable: true, isDerived: false }))).toThrow("summary definitions");
    expect(() => validateDefinitionCandidate(definition({ rowType: "reporting_reference", isEditable: false, isDerived: false }))).toThrow("reporting_reference definitions");
    expect(() => validateDefinitionCandidate(definition({ rowType: "activity", isDerived: true }))).toThrow("cannot be derived");
  });

  it("accepts valid Target stages and rejects unknown ones", () => {
    expect(() => validateDefinitionCandidate(definition({ stageCode: "land-activation" }))).not.toThrow();
    expect(() => validateDefinitionCandidate(definition({ stageCode: "unknown-stage" }))).toThrow("Unknown Target Programme stage code");
    expect(() => validateDefinitionCandidate(definition({ programmeArea: "reporting", stageCode: "Existing reporting metadata" }))).not.toThrow();
  });

  it("rejects structural changes that invalidate active relationships", () => {
    const other = definition({ guid: "other", itemCode: "other.code" });
    const dependency = { guid: "dependency", predecessorItemDefinitionGuid: "activity", successorItemDefinitionGuid: "other", dependencyType: "FS", lagDays: 0, successorField: "target_end", isActive: true };
    expect(() => validateProgrammeConfiguration(config({
      definitions: [definition({ guid: "activity", itemCode: "activity.code", rowType: "summary", isEditable: false, isDerived: true }), other],
      dependencies: [dependency],
    }))).toThrow("activities or milestones");
  });

  it("allows an unreferenced definition retirement and rejects referenced retirement", () => {
    const summary = definition({ guid: "summary", itemCode: "summary.code", rowType: "summary", isEditable: false, isDerived: true });
    const membership = { guid: "membership", summaryItemDefinitionGuid: "summary", childItemDefinitionGuid: "child", sortOrder: 0, isActive: true };
    expect(() => validateProgrammeConfiguration(config({ definitions: [summary] }))).not.toThrow();
    expect(() => validateProgrammeConfiguration(config({ definitions: [summary], summaryMemberships: [membership] }))).toThrow("Summary child definition does not exist");
  });

  it("rejects duplicate, self, and cyclic summary configuration while allowing nesting", () => {
    const parent = definition({ guid: "parent", itemCode: "parent.code", rowType: "summary", isEditable: false, isDerived: true });
    const child = definition({ guid: "child", itemCode: "child.code", rowType: "summary", isEditable: false, isDerived: true });
    const leaf = definition({ guid: "leaf", itemCode: "leaf.code" });
    const valid = [
      { guid: "one", summaryItemDefinitionGuid: "parent", childItemDefinitionGuid: "child", sortOrder: 0, isActive: true },
      { guid: "two", summaryItemDefinitionGuid: "child", childItemDefinitionGuid: "leaf", sortOrder: 0, isActive: true },
    ];
    expect(() => validateProgrammeConfiguration(config({ definitions: [parent, child, leaf], summaryMemberships: valid }))).not.toThrow();
    expect(() => validateProgrammeConfiguration(config({ definitions: [parent, leaf], summaryMemberships: [{ ...valid[0], childItemDefinitionGuid: "parent" }] }))).toThrow("self-membership");
    expect(() => validateProgrammeConfiguration(config({ definitions: [parent, child], summaryMemberships: [{ ...valid[0], childItemDefinitionGuid: "child" }, { ...valid[1], summaryItemDefinitionGuid: "child", childItemDefinitionGuid: "parent" }] }))).toThrow("Summary membership cycle");
    expect(() => validateProgrammeConfiguration(config({ definitions: [parent, leaf], summaryMemberships: [{ ...valid[0], childItemDefinitionGuid: "leaf" }, { ...valid[0], guid: "duplicate" , childItemDefinitionGuid: "leaf" }] }))).toThrow("Duplicate active summary membership");
  });
});

describe("programme Admin relationship rules", () => {
  const activity = definition({ guid: "activity", itemCode: "activity.code" });
  const other = definition({ guid: "other", itemCode: "other.code" });
  const reporting = definition({ guid: "reporting", itemCode: "reporting.code", programmeArea: "reporting", stageCode: "reporting" });
  const milestone = definition({ guid: "milestone", itemCode: "milestone.code", rowType: "milestone" });
  const reference = definition({ guid: "reference", itemCode: "reference.code", rowType: "reporting_reference", isEditable: false, isDerived: true });

  it("accepts FS lag values and rejects invalid dependency controllers", () => {
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, other], dependencies: [{ guid: "valid", predecessorItemDefinitionGuid: "activity", successorItemDefinitionGuid: "other", dependencyType: "FS", lagDays: -2, successorField: "target_end", isActive: true }] }))).not.toThrow();
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, milestone], dependencies: [{ guid: "invalid", predecessorItemDefinitionGuid: "activity", successorItemDefinitionGuid: "milestone", dependencyType: "FS", lagDays: 0, successorField: "target_start", isActive: true }] }))).toThrow("target_start dependencies");
    const duplicate = { guid: "duplicate", predecessorItemDefinitionGuid: "activity", successorItemDefinitionGuid: "other", dependencyType: "FS", lagDays: 1, successorField: "target_end", isActive: true };
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, other], dependencies: [duplicate, { ...duplicate, guid: "duplicate-2" }] }))).toThrow("Multiple active dependencies");
  });

  it("accepts explicit mappings and rejects invalid areas, targets, references, and duplicates", () => {
    const mapping = { guid: "mapping", reportingItemDefinitionGuid: "reporting", reportingField: "reporting_end", targetItemDefinitionGuid: "activity", targetField: "target_end", reportingReferenceItemDefinitionGuid: "reference", isActive: true };
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, reporting, reference], reportingMappings: [mapping] }))).not.toThrow();
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, reporting, reference], reportingMappings: [mapping, { ...mapping, guid: "mapping-2" }] }))).toThrow("Duplicate active reporting mapping");
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, reporting, milestone], reportingMappings: [{ ...mapping, targetItemDefinitionGuid: "milestone", targetField: "target_start", reportingReferenceItemDefinitionGuid: undefined }] }))).toThrow("Milestones cannot provide target_start");
    expect(() => validateProgrammeConfiguration(config({ definitions: [activity, reporting], reportingMappings: [{ ...mapping, reportingReferenceItemDefinitionGuid: "activity" }] }))).toThrow("reference must be a target reporting_reference");
  });
});

describe("programme Admin bootstrap eligibility", () => {
  it("requires development mode and an exact normalized current-user email match", () => {
    const input = { isDevelopment: true, configuredEmail: " Owner@Example.COM ", currentUserEmail: "owner@example.com" };
    expect(isProgrammeAdminBootstrapEligible(input)).toBe(true);
    expect(isProgrammeAdminBootstrapEligible({ ...input, currentUserEmail: "other@example.com" })).toBe(false);
    expect(isProgrammeAdminBootstrapEligible({ ...input, configuredEmail: "" })).toBe(false);
    expect(isProgrammeAdminBootstrapEligible({ ...input, currentUserEmail: undefined })).toBe(false);
    expect(isProgrammeAdminBootstrapEligible({ ...input, isDevelopment: false })).toBe(false);
  });
});

describe("programme Admin bootstrap normalization", () => {
  it("trims and normalizes bootstrap email and rejects blank input", () => {
    expect(normalizeProgrammeAdminEmail("  Owner@Example.COM ")).toBe("owner@example.com");
    expect(() => normalizeProgrammeAdminEmail("   ")).toThrow("email is required");
  });
});

describe("programme Admin role evaluation", () => {
  const today = new Date(2026, 7, 23);
  const base = { roleCode: "project_index_admin", activeFlag: true, effectiveFrom: "2026-01-01" };
  it("uses inclusive, calendar-safe effective date boundaries", () => {
    expect(isProgrammeAdminRoleEffective({ ...base, effectiveFrom: "2026-08-23" }, today)).toBe(true);
    expect(isProgrammeAdminRoleEffective({ ...base, effectiveTo: "2026-08-23" }, today)).toBe(true);
    expect(isProgrammeAdminRoleEffective({ ...base, effectiveFrom: "2026-08-24" }, today)).toBe(false);
    expect(isProgrammeAdminRoleEffective({ ...base, effectiveTo: "2026-08-22" }, today)).toBe(false);
  });
  it("denies inactive and wrong role codes", () => {
    expect(isProgrammeAdminRoleEffective({ ...base, activeFlag: false }, today)).toBe(false);
    expect(isProgrammeAdminRoleEffective({ ...base, roleCode: "project_register_admin" }, today)).toBe(false);
  });
});
