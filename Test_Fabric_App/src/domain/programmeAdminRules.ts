import {
  TARGET_PROGRAMME_STAGES,
  type TargetStageCode,
} from "@/domain/targetProgrammeStages";
import {
  validateProgrammeDependencies,
  validateReportingMappings,
  validateSummaryMemberships,
  type DependencyDefinition,
  type ProgrammeRuleDefinition,
  type ReportingMapping,
  type SummaryMembership,
} from "@/domain/programmeRules";

export type AdminDefinition = ProgrammeRuleDefinition & {
  id?: string;
  itemCode: string;
  stageCode: string;
  rowLabel: string;
  sortOrder: number;
  levelCode?: string;
  isEditable: boolean;
  isDerived: boolean;
  isActive?: boolean;
};

export type ProgrammeConfiguration = {
  definitions: AdminDefinition[];
  summaryMemberships: SummaryMembership[];
  dependencies: DependencyDefinition[];
  reportingMappings: ReportingMapping[];
};

export function validateDefinitionCandidate(
  definition: AdminDefinition,
  current?: AdminDefinition,
): void {
  if (current && definition.itemCode !== current.itemCode) {
    throw new Error("Definition item_code cannot be changed after creation.");
  }
  if (!definition.itemCode.trim()) {
    throw new Error("Definition item_code is required.");
  }
  if (!definition.rowLabel.trim()) {
    throw new Error("Definition row_label is required.");
  }
  if (!Number.isInteger(definition.sortOrder) || definition.sortOrder < 0) {
    throw new Error("Definition sort_order must be an integer greater than or equal to zero.");
  }
  if (definition.programmeArea !== "reporting" && definition.programmeArea !== "target") {
    throw new Error("Definition programme_area must be reporting or target.");
  }
  if (definition.programmeArea === "target") {
    const validStage = TARGET_PROGRAMME_STAGES.some((stage) => stage.code === definition.stageCode);
    if (!validStage) {
      throw new Error(`Unknown Target Programme stage code: ${definition.stageCode}`);
    }
  } else if (!definition.stageCode.trim()) {
    throw new Error("Reporting definition stage_code is required.");
  }
  if (!["activity", "milestone", "summary", "reporting_reference"].includes(definition.rowType)) {
    throw new Error(`Unsupported definition row_type: ${definition.rowType}`);
  }
  if (["summary", "reporting_reference"].includes(definition.rowType)) {
    if (definition.isEditable || !definition.isDerived) {
      throw new Error(`${definition.rowType} definitions must be non-editable and derived.`);
    }
  } else if (definition.isDerived) {
    throw new Error("Activity and milestone definitions cannot be derived.");
  }
}

function ruleDefinitions(definitions: AdminDefinition[]): ProgrammeRuleDefinition[] {
  return definitions.map(({ guid, programmeArea, rowType }) => ({ guid, programmeArea, rowType }));
}

function assertNoDuplicateSummaryMemberships(memberships: SummaryMembership[]): void {
  const seen = new Set<string>();
  for (const membership of memberships.filter((item) => item.isActive)) {
    const key = `${membership.summaryItemDefinitionGuid}:${membership.childItemDefinitionGuid}`;
    if (seen.has(key)) throw new Error(`Duplicate active summary membership: ${key}`);
    seen.add(key);
  }
}

function assertNoDuplicateMappings(mappings: ReportingMapping[]): void {
  const seen = new Set<string>();
  for (const mapping of mappings.filter((item) => item.isActive !== false)) {
    const key = [
      mapping.reportingItemDefinitionGuid,
      mapping.reportingField,
      mapping.targetItemDefinitionGuid,
      mapping.targetField,
      mapping.reportingReferenceItemDefinitionGuid ?? "",
    ].join(":");
    if (seen.has(key)) throw new Error(`Duplicate active reporting mapping: ${key}`);
    seen.add(key);
  }
}

export function validateProgrammeConfiguration(
  configuration: ProgrammeConfiguration,
): void {
  const activeDefinitions = configuration.definitions.filter((definition) => definition.isActive !== false);
  const definitionCodes = new Set<string>();
  const definitionGuids = new Set<string>();
  for (const definition of activeDefinitions) {
    validateDefinitionCandidate(definition);
    if (definitionCodes.has(definition.itemCode)) {
      throw new Error(`Duplicate active definition item_code: ${definition.itemCode}`);
    }
    if (definitionGuids.has(definition.guid)) {
      throw new Error(`Duplicate active definition GUID: ${definition.guid}`);
    }
    definitionCodes.add(definition.itemCode);
    definitionGuids.add(definition.guid);
  }

  const definitions = ruleDefinitions(activeDefinitions);
  const memberships = configuration.summaryMemberships.filter((item) => item.isActive);
  const dependencies = configuration.dependencies.filter((item) => item.isActive);
  const mappings = configuration.reportingMappings.filter((item) => item.isActive !== false);
  assertNoDuplicateSummaryMemberships(memberships);
  assertNoDuplicateMappings(mappings);
  validateSummaryMemberships(definitions, memberships);
  validateProgrammeDependencies(definitions, dependencies);
  validateReportingMappings(definitions, mappings);
}

export type ProgrammeAdminRoleCandidate = {
  roleCode: string;
  activeFlag: boolean;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
};

function dateOnly(value: Date | string): Date {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new Error(`Unsupported role effective date format: ${value}`);
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function isProgrammeAdminRoleEffective(
  role: ProgrammeAdminRoleCandidate,
  today = new Date(),
): boolean {
  if (role.roleCode !== "project_index_admin" || !role.activeFlag) return false;
  const current = dateOnly(today);
  const from = dateOnly(role.effectiveFrom);
  const to = role.effectiveTo ? dateOnly(role.effectiveTo) : undefined;
  return from <= current && (!to || to >= current);
}

export function validateTargetStageCode(stageCode: string): stageCode is TargetStageCode {
  return TARGET_PROGRAMME_STAGES.some((stage) => stage.code === stageCode);
}
