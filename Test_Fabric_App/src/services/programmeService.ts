import type { master_project_register } from "../../rayfin/data/master_project_register";
import type { project_reporting_programme_item } from "../../rayfin/data/project_reporting_programme_item";
import type { programme_dependency_definition } from "../../rayfin/data/programme_dependency_definition";
import type { programme_item_definition } from "../../rayfin/data/programme_item_definition";
import type { programme_reporting_mapping } from "../../rayfin/data/programme_reporting_mapping";
import type { programme_summary_member } from "../../rayfin/data/programme_summary_member";
import type { project_programme } from "../../rayfin/data/project_programme";

import {
  resolveReportingMappings,
  validateProgrammeDependencies,
  validateSummaryMemberships,
  type DependencyDefinition,
  type ReportingMapping,
  type SummaryMembership,
} from "@/domain/programmeRules";
import {
  buildReportingMigrationPlan,
  isCompatibleReportingDefinition,
  REPORTING_COMPATIBILITY_DEFINITIONS,
  requiresReportingMigration,
  type LegacyReportingRecord,
} from "@/domain/reportingProgramme";
import { getRayfinClient } from "./rayfinClient";

export type ProgrammeArea = "reporting" | "target";
export type ProgrammeRowType =
  | "activity"
  | "milestone"
  | "summary"
  | "reporting_reference";

export type ProgrammeDefinitionRecord = Pick<
  programme_item_definition,
  | "id"
  | "guid"
  | "item_code"
  | "programme_area"
  | "stage_code"
  | "row_label"
  | "row_type"
  | "sort_order"
  | "level_code"
  | "is_active"
  | "is_editable"
  | "is_derived"
  | "effective_from"
  | "effective_to"
>;

export type ProjectProgrammeRecord = Pick<
  project_programme,
  | "id"
  | "guid"
  | "project_guid"
  | "programme_item_definition_guid"
  | "baseline_start"
  | "baseline_end"
  | "target_start"
  | "target_end"
  | "reporting_start"
  | "reporting_end"
  | "created_at"
  | "created_by_user_id"
  | "created_by_user_email"
  | "updated_at"
  | "updated_by_user_id"
  | "updated_by_user_email"
>;

type ActiveProjectRecord = Pick<master_project_register, "guid" | "effective_to">;

const ACTIVE_PROJECT_FIELDS = ["guid", "effective_to"] as const;
const ACTIVE_EFFECTIVE_TO = "2099-12-31";

export type ProgrammeDateSet = Pick<
  ProjectProgrammeRecord,
  | "baseline_start"
  | "baseline_end"
  | "target_start"
  | "target_end"
  | "reporting_start"
  | "reporting_end"
>;

export type ProgrammeDatePatch = Partial<
  Record<keyof ProgrammeDateSet, Date | null | undefined>
>;

export type ProgrammeDefinitionSeed = {
  guid: string;
  itemCode: string;
  programmeArea: ProgrammeArea;
  stageCode: string;
  rowLabel: string;
  rowType: ProgrammeRowType;
  sortOrder: number;
  levelCode?: string;
  isEditable: boolean;
  isDerived: boolean;
};

export type SummaryMemberRecord = Pick<
  programme_summary_member,
  | "id"
  | "guid"
  | "summary_item_definition_guid"
  | "child_item_definition_guid"
  | "sort_order"
  | "is_active"
  | "effective_from"
  | "effective_to"
>;

export type DependencyDefinitionRecord = Pick<
  programme_dependency_definition,
  | "id"
  | "guid"
  | "predecessor_item_definition_guid"
  | "successor_item_definition_guid"
  | "dependency_type"
  | "lag_days"
  | "successor_field"
  | "is_active"
  | "effective_from"
  | "effective_to"
>;

export type ReportingMappingRecord = Pick<
  programme_reporting_mapping,
  | "id"
  | "guid"
  | "reporting_item_definition_guid"
  | "reporting_field"
  | "target_item_definition_guid"
  | "target_field"
  | "reporting_reference_item_definition_guid"
  | "is_active"
  | "effective_from"
  | "effective_to"
>;

/**
 * Representative development configuration only; this is not the final catalogue.
 * Stable GUIDs make the sample definitions deterministic for local development.
 */
export const representativeProgrammeDefinitions: readonly ProgrammeDefinitionSeed[] = [
  {
    guid: "10000000-0000-4000-8000-000000000001",
    itemCode: "reporting.sample-activity",
    programmeArea: "reporting",
    stageCode: "reporting",
    rowLabel: "Reporting sample activity",
    rowType: "activity",
    sortOrder: 1,
    levelCode: "O",
    isEditable: true,
    isDerived: false,
  },
  {
    guid: "10000000-0000-4000-8000-000000000002",
    itemCode: "reporting.sample-milestone",
    programmeArea: "reporting",
    stageCode: "reporting",
    rowLabel: "Reporting sample milestone",
    rowType: "milestone",
    sortOrder: 2,
    levelCode: "E",
    isEditable: true,
    isDerived: false,
  },
  {
    guid: "10000000-0000-4000-8000-000000000003",
    itemCode: "reporting.sample-summary",
    programmeArea: "reporting",
    stageCode: "reporting",
    rowLabel: "Reporting sample summary",
    rowType: "summary",
    sortOrder: 3,
    levelCode: "B",
    isEditable: false,
    isDerived: true,
  },
  {
    guid: "10000000-0000-4000-8000-000000000004",
    itemCode: "reporting.sample-reference",
    programmeArea: "reporting",
    stageCode: "reporting",
    rowLabel: "Reporting sample reference",
    rowType: "reporting_reference",
    sortOrder: 4,
    levelCode: "B",
    isEditable: false,
    isDerived: true,
  },
  {
    guid: "20000000-0000-4000-8000-000000000001",
    itemCode: "target.sample-activity",
    programmeArea: "target",
    stageCode: "sample",
    rowLabel: "Target sample activity",
    rowType: "activity",
    sortOrder: 1,
    isEditable: true,
    isDerived: false,
  },
  {
    guid: "20000000-0000-4000-8000-000000000002",
    itemCode: "target.sample-milestone",
    programmeArea: "target",
    stageCode: "sample",
    rowLabel: "Target sample milestone",
    rowType: "milestone",
    sortOrder: 2,
    isEditable: true,
    isDerived: false,
  },
  {
    guid: "20000000-0000-4000-8000-000000000003",
    itemCode: "target.sample-summary",
    programmeArea: "target",
    stageCode: "sample",
    rowLabel: "Target sample summary",
    rowType: "summary",
    sortOrder: 3,
    isEditable: false,
    isDerived: true,
  },
  {
    guid: "20000000-0000-4000-8000-000000000004",
    itemCode: "target.sample-reference",
    programmeArea: "target",
    stageCode: "sample",
    rowLabel: "Target sample reporting reference",
    rowType: "reporting_reference",
    sortOrder: 4,
    isEditable: false,
    isDerived: true,
  },
];

export const representativeSummaryMembers: readonly SummaryMembership[] = [
  {
    guid: "30000000-0000-4000-8000-000000000001",
    summaryItemDefinitionGuid: "20000000-0000-4000-8000-000000000003",
    childItemDefinitionGuid: "20000000-0000-4000-8000-000000000001",
    sortOrder: 1,
    isActive: true,
  },
  {
    guid: "30000000-0000-4000-8000-000000000002",
    summaryItemDefinitionGuid: "20000000-0000-4000-8000-000000000003",
    childItemDefinitionGuid: "20000000-0000-4000-8000-000000000002",
    sortOrder: 2,
    isActive: true,
  },
];

export const representativeDependencies: readonly DependencyDefinition[] = [
  {
    guid: "40000000-0000-4000-8000-000000000001",
    predecessorItemDefinitionGuid: "20000000-0000-4000-8000-000000000001",
    successorItemDefinitionGuid: "20000000-0000-4000-8000-000000000002",
    dependencyType: "FS",
    lagDays: 0,
    successorField: "target_end",
    isActive: true,
  },
];

export const representativeReportingMappings: readonly ReportingMapping[] = [
  {
    guid: "50000000-0000-4000-8000-000000000001",
    reportingItemDefinitionGuid: "10000000-0000-4000-8000-000000000001",
    reportingField: "reporting_end",
    targetItemDefinitionGuid: "20000000-0000-4000-8000-000000000001",
    targetField: "target_end",
    reportingReferenceItemDefinitionGuid: "20000000-0000-4000-8000-000000000004",
  },
];

const PROGRAMME_DEFINITION_FIELDS = [
  "id",
  "guid",
  "item_code",
  "programme_area",
  "stage_code",
  "row_label",
  "row_type",
  "sort_order",
  "level_code",
  "is_active",
  "is_editable",
  "is_derived",
  "effective_from",
  "effective_to",
] as const;

async function assertActiveProject(projectGuid: string): Promise<void> {
  const project = (await getRayfinClient()
    .data.master_project_register.select(ACTIVE_PROJECT_FIELDS)
    .where({ guid: { eq: projectGuid } })
    .findFirst()) as ActiveProjectRecord | null;

  if (!project || new Date(project.effective_to).toISOString().slice(0, 10) !== ACTIVE_EFFECTIVE_TO) {
    throw new Error("Programme records require an active project.");
  }
}

const SUMMARY_MEMBER_FIELDS = [
  "id",
  "guid",
  "summary_item_definition_guid",
  "child_item_definition_guid",
  "sort_order",
  "is_active",
  "effective_from",
  "effective_to",
] as const;

const DEPENDENCY_FIELDS = [
  "id",
  "guid",
  "predecessor_item_definition_guid",
  "successor_item_definition_guid",
  "dependency_type",
  "lag_days",
  "successor_field",
  "is_active",
  "effective_from",
  "effective_to",
] as const;

const REPORTING_MAPPING_FIELDS = [
  "id",
  "guid",
  "reporting_item_definition_guid",
  "reporting_field",
  "target_item_definition_guid",
  "target_field",
  "reporting_reference_item_definition_guid",
  "is_active",
  "effective_from",
  "effective_to",
] as const;

const LEGACY_REPORTING_FIELDS = [
  "row_code",
  "row_label",
  "start_date",
  "end_date",
] as const;

const PROJECT_PROGRAMME_FIELDS = [
  "id",
  "guid",
  "project_guid",
  "programme_item_definition_guid",
  "baseline_start",
  "baseline_end",
  "target_start",
  "target_end",
  "reporting_start",
  "reporting_end",
  "created_at",
  "created_by_user_id",
  "created_by_user_email",
  "updated_at",
  "updated_by_user_id",
  "updated_by_user_email",
] as const;

function getCurrentUser() {
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error("You must be signed in to access programme data.");
  }
  return { id: session.user.id, email: session.user.email };
}

export function findDuplicateProjectProgrammeRecord(
  records: Pick<
    ProjectProgrammeRecord,
    "project_guid" | "programme_item_definition_guid"
  >[],
  projectGuid: string,
  definitionGuid: string,
) {
  return records.find(
    (record) =>
      record.project_guid === projectGuid &&
      record.programme_item_definition_guid === definitionGuid,
  );
}

export function applyProgrammeDatePatch(
  current: ProgrammeDateSet,
  patch: ProgrammeDatePatch,
): ProgrammeDateSet {
  return { ...current, ...patch } as ProgrammeDateSet;
}

export async function seedRepresentativeProgrammeDefinitions(): Promise<
  ProgrammeDefinitionRecord[]
> {
  const client = getRayfinClient().data.programme_item_definition;
  const user = getCurrentUser();
  const now = new Date();
  const seeded: ProgrammeDefinitionRecord[] = [];

  for (const definition of representativeProgrammeDefinitions) {
    const existingByCode = await client
      .select(PROGRAMME_DEFINITION_FIELDS)
      .where({ item_code: { eq: definition.itemCode } })
      .findFirst();
    const existingByGuid = await client
      .select(PROGRAMME_DEFINITION_FIELDS)
      .where({ guid: { eq: definition.guid } })
      .findFirst();
    const existing = existingByCode ?? existingByGuid;

    if (existingByCode && existingByCode.guid !== definition.guid) {
      throw new Error(
        `Programme definition code already belongs to another GUID: ${definition.itemCode}`,
      );
    }
    if (existingByGuid && existingByGuid.item_code !== definition.itemCode) {
      throw new Error(
        `Programme definition GUID already belongs to another code: ${definition.guid}`,
      );
    }

    if (existing) {
      seeded.push(existing);
      continue;
    }

    const id = definition.guid;
    const created = await client.create({
      id,
      guid: definition.guid,
      item_code: definition.itemCode,
      programme_area: definition.programmeArea,
      stage_code: definition.stageCode,
      row_label: definition.rowLabel,
      row_type: definition.rowType,
      sort_order: definition.sortOrder,
      level_code: definition.levelCode,
      is_active: true,
      is_editable: definition.isEditable,
      is_derived: definition.isDerived,
      effective_from: now,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    });
    seeded.push(created);
  }

  return seeded;
}

export async function ensureReportingCompatibilityDefinitions(): Promise<ProgrammeDefinitionRecord[]> {
  const client = getRayfinClient().data.programme_item_definition;
  const user = getCurrentUser();
  const now = new Date();
  const persisted: ProgrammeDefinitionRecord[] = [];

  for (const definition of REPORTING_COMPATIBILITY_DEFINITIONS) {
    const byCode = await client.select(PROGRAMME_DEFINITION_FIELDS)
      .where({ item_code: { eq: definition.itemCode } }).findFirst();
    const byGuid = await client.select(PROGRAMME_DEFINITION_FIELDS)
      .where({ guid: { eq: definition.guid } }).findFirst();
    if (byCode && byCode.guid !== definition.guid) {
      throw new Error(`Reporting compatibility code has conflicting GUID: ${definition.itemCode}`);
    }
    if (byGuid && byGuid.item_code !== definition.itemCode) {
      throw new Error(`Reporting compatibility GUID has conflicting code: ${definition.guid}`);
    }
    const existing = byCode ?? byGuid;
    if (existing) {
      if (!isCompatibleReportingDefinition(existing, definition)) {
        throw new Error(`Reporting compatibility definition has conflicting semantics: ${definition.itemCode}`);
      }
      persisted.push(existing);
      continue;
    }
    const id = definition.guid;
    persisted.push(await client.create({
      id,
      guid: definition.guid,
      item_code: definition.itemCode,
      programme_area: "reporting",
      stage_code: definition.stageCode,
      row_label: definition.rowLabel,
      row_type: "activity",
      sort_order: definition.sortOrder,
      level_code: definition.levelCode,
      is_active: true,
      is_editable: definition.isEditable,
      is_derived: false,
      effective_from: now,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    }));
  }
  return persisted;
}

export async function listActiveProgrammeDefinitions(options: {
  programmeArea?: ProgrammeArea;
  stageCode?: string;
} = {}): Promise<ProgrammeDefinitionRecord[]> {
  const client = getRayfinClient().data.programme_item_definition.select(
    PROGRAMME_DEFINITION_FIELDS,
  );
  const definitions = options.programmeArea
    ? await client
        .where({
          programme_area: { eq: options.programmeArea },
          is_active: { eq: true },
        })
        .first(-1)
        .execute()
    : await client.where({ is_active: { eq: true } }).first(-1).execute();

  return definitions
    .filter((definition) => !options.stageCode || definition.stage_code === options.stageCode)
    .sort(
      (left, right) =>
        left.stage_code.localeCompare(right.stage_code) ||
        left.sort_order - right.sort_order,
    );
}

export async function listActiveSummaryMembers(): Promise<SummaryMemberRecord[]> {
  return getRayfinClient()
    .data.programme_summary_member.select(SUMMARY_MEMBER_FIELDS)
    .where({ is_active: { eq: true } })
    .first(-1)
    .execute();
}

export async function listActiveDependencyDefinitions(): Promise<DependencyDefinitionRecord[]> {
  return getRayfinClient()
    .data.programme_dependency_definition.select(DEPENDENCY_FIELDS)
    .where({ is_active: { eq: true } })
    .first(-1)
    .execute();
}

export async function listActiveReportingMappings(): Promise<ReportingMappingRecord[]> {
  return getRayfinClient()
    .data.programme_reporting_mapping.select(REPORTING_MAPPING_FIELDS)
    .where({ is_active: { eq: true } })
    .first(-1)
    .execute();
}

export async function seedRepresentativeProgrammeRelationships(): Promise<{
  summaryMembers: SummaryMemberRecord[];
  dependencies: DependencyDefinitionRecord[];
  mappings: ReportingMappingRecord[];
}> {
  const persistedDefinitions = await seedRepresentativeProgrammeDefinitions();
  const definitions = persistedDefinitions.map((definition) => ({
    guid: definition.guid,
    programmeArea: definition.programme_area as ProgrammeArea,
    rowType: definition.row_type as ProgrammeRowType,
  }));
  validateSummaryMemberships(definitions, [...representativeSummaryMembers]);
  validateProgrammeDependencies(definitions, [...representativeDependencies]);
  resolveReportingMappings(
    definitions,
    [],
    [...representativeReportingMappings],
  );

  const user = getCurrentUser();
  const now = new Date();
  const seededSummaryMembers: SummaryMemberRecord[] = [];
  const seededDependencies: DependencyDefinitionRecord[] = [];
  const seededMappings: ReportingMappingRecord[] = [];
  const summaryMembers = await listActiveSummaryMembers();
  const dependencies = await listActiveDependencyDefinitions();
  const mappings = await listActiveReportingMappings();

  for (const member of representativeSummaryMembers) {
    const existing = summaryMembers.find((record) => record.guid === member.guid) ??
      summaryMembers.find(
        (record) =>
          record.summary_item_definition_guid === member.summaryItemDefinitionGuid &&
          record.child_item_definition_guid === member.childItemDefinitionGuid,
      );
    if (existing) {
      if (
        existing.summary_item_definition_guid !== member.summaryItemDefinitionGuid ||
        existing.child_item_definition_guid !== member.childItemDefinitionGuid
      ) {
        throw new Error(`Summary member GUID has conflicting semantics: ${member.guid}`);
      }
      seededSummaryMembers.push(existing);
      continue;
    }
    const created = await getRayfinClient().data.programme_summary_member.create({
      id: member.guid,
      guid: member.guid,
      summary_item_definition_guid: member.summaryItemDefinitionGuid,
      child_item_definition_guid: member.childItemDefinitionGuid,
      sort_order: member.sortOrder,
      is_active: true,
      effective_from: now,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    });
    seededSummaryMembers.push(created);
  }

  for (const dependency of representativeDependencies) {
    const existing = dependencies.find((record) => record.guid === dependency.guid) ??
      dependencies.find(
        (record) =>
          record.predecessor_item_definition_guid === dependency.predecessorItemDefinitionGuid &&
          record.successor_item_definition_guid === dependency.successorItemDefinitionGuid &&
          record.successor_field === dependency.successorField,
      );
    if (existing) {
      if (
        existing.predecessor_item_definition_guid !== dependency.predecessorItemDefinitionGuid ||
        existing.successor_item_definition_guid !== dependency.successorItemDefinitionGuid ||
        existing.dependency_type !== dependency.dependencyType ||
        existing.lag_days !== dependency.lagDays ||
        existing.successor_field !== dependency.successorField
      ) {
        throw new Error(`Dependency GUID has conflicting semantics: ${dependency.guid}`);
      }
      seededDependencies.push(existing);
      continue;
    }
    const created = await getRayfinClient().data.programme_dependency_definition.create({
      id: dependency.guid,
      guid: dependency.guid,
      predecessor_item_definition_guid: dependency.predecessorItemDefinitionGuid,
      successor_item_definition_guid: dependency.successorItemDefinitionGuid,
      dependency_type: dependency.dependencyType,
      lag_days: dependency.lagDays,
      successor_field: dependency.successorField,
      is_active: true,
      effective_from: now,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    });
    seededDependencies.push(created);
  }

  for (const mapping of representativeReportingMappings) {
    const existing = mappings.find((record) => record.guid === mapping.guid) ??
      mappings.find(
        (record) =>
          record.reporting_item_definition_guid === mapping.reportingItemDefinitionGuid &&
          record.reporting_field === mapping.reportingField &&
          record.target_item_definition_guid === mapping.targetItemDefinitionGuid &&
          record.target_field === mapping.targetField,
      );
    if (existing) {
      if (
        existing.reporting_item_definition_guid !== mapping.reportingItemDefinitionGuid ||
        existing.reporting_field !== mapping.reportingField ||
        existing.target_item_definition_guid !== mapping.targetItemDefinitionGuid ||
        existing.target_field !== mapping.targetField ||
        existing.reporting_reference_item_definition_guid !== mapping.reportingReferenceItemDefinitionGuid
      ) {
        throw new Error(`Reporting mapping GUID has conflicting semantics: ${mapping.guid}`);
      }
      seededMappings.push(existing);
      continue;
    }
    const created = await getRayfinClient().data.programme_reporting_mapping.create({
      id: mapping.guid,
      guid: mapping.guid,
      reporting_item_definition_guid: mapping.reportingItemDefinitionGuid,
      reporting_field: mapping.reportingField,
      target_item_definition_guid: mapping.targetItemDefinitionGuid,
      target_field: mapping.targetField,
      reporting_reference_item_definition_guid:
        mapping.reportingReferenceItemDefinitionGuid,
      is_active: true,
      effective_from: now,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    });
    seededMappings.push(created);
  }

  return {
    summaryMembers: seededSummaryMembers,
    dependencies: seededDependencies,
    mappings: seededMappings,
  };
}

export async function migrateReportingProgramme(
  projectGuid: string,
  compatibilityDefinitions: readonly ProgrammeDefinitionRecord[],
): Promise<void> {
  const canonicalRecords = await listProjectProgrammeRecords(projectGuid);
  if (!requiresReportingMigration(REPORTING_COMPATIBILITY_DEFINITIONS, compatibilityDefinitions, canonicalRecords)) {
    return;
  }
  const legacyRows = await getRayfinClient().data.project_reporting_programme_item
    .select(LEGACY_REPORTING_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute() as project_reporting_programme_item[];
  const plan = buildReportingMigrationPlan(
    REPORTING_COMPATIBILITY_DEFINITIONS,
    legacyRows as LegacyReportingRecord[],
    canonicalRecords,
  );
  const activeDefinitionGuids = new Set(
    compatibilityDefinitions.filter((definition) => definition.is_active).map((definition) => definition.guid),
  );
  const user = getCurrentUser();
  const now = new Date();
  for (const decision of plan) {
    if (!decision.create || !activeDefinitionGuids.has(decision.definitionGuid)) continue;
    const id = crypto.randomUUID();
    await getRayfinClient().data.project_programme.create({
      id,
      guid: id,
      project_guid: projectGuid,
      programme_item_definition_guid: decision.definitionGuid,
      reporting_start: decision.reportingStart,
      reporting_end: decision.reportingEnd,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    });
  }
}

export async function ensureCanonicalReportingProgramme(
  projectGuid: string,
): Promise<{ definitions: ProgrammeDefinitionRecord[]; records: ProjectProgrammeRecord[] }> {
  const compatibility = await ensureReportingCompatibilityDefinitions();
  await migrateReportingProgramme(projectGuid, compatibility);
  const definitions = await listActiveProgrammeDefinitions({ programmeArea: "reporting" });
  const existing = await listProjectProgrammeRecords(projectGuid);
  const missing = definitions.filter((definition) => !findDuplicateProjectProgrammeRecord(existing, projectGuid, definition.guid));
  if (missing.length > 0) {
    await Promise.all(missing.map((definition) => ensureProjectProgrammeRecord(projectGuid, definition.guid)));
  }
  return { definitions, records: await listProjectProgrammeRecords(projectGuid) };
}

export async function listProjectProgrammeRecords(
  projectGuid: string,
): Promise<ProjectProgrammeRecord[]> {
  return getRayfinClient()
    .data.project_programme.select(PROJECT_PROGRAMME_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();
}

/**
 * Creates an instance only when the project/definition pair is absent.
 * Rayfin 1.34.0 conventions in this repo do not expose a compound unique
 * decorator, so concurrent callers still require later database enforcement.
 */
export async function ensureProjectProgrammeRecord(
  projectGuid: string,
  programmeItemDefinitionGuid: string,
): Promise<ProjectProgrammeRecord> {
  await assertActiveProject(projectGuid);

  const definition = await getRayfinClient()
    .data.programme_item_definition.select(PROGRAMME_DEFINITION_FIELDS)
    .where({ guid: { eq: programmeItemDefinitionGuid }, is_active: { eq: true } })
    .findFirst();

  if (!definition) {
    throw new Error("Programme records require an active programme definition.");
  }

  const existing = await getRayfinClient()
    .data.project_programme.select(PROJECT_PROGRAMME_FIELDS)
    .where({
      project_guid: { eq: projectGuid },
      programme_item_definition_guid: { eq: programmeItemDefinitionGuid },
    })
    .findFirst();

  if (existing) return existing;

  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();

  return getRayfinClient().data.project_programme.create({
    id,
    guid: id,
    project_guid: projectGuid,
    programme_item_definition_guid: programmeItemDefinitionGuid,
    created_at: now,
    created_by_user_id: user.id,
    created_by_user_email: user.email,
    updated_at: now,
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  });
}

export async function initializeProjectProgrammeRecords(
  projectGuid: string,
  programmeItemDefinitionGuids: string[],
): Promise<ProjectProgrammeRecord[]> {
  return Promise.all(
    programmeItemDefinitionGuids.map((definitionGuid) =>
      ensureProjectProgrammeRecord(projectGuid, definitionGuid),
    ),
  );
}

export async function updateProjectProgrammeDates(
  recordId: string,
  patch: ProgrammeDatePatch,
): Promise<void> {
  const user = getCurrentUser();
  const update: Partial<ProjectProgrammeRecord> = {
    updated_at: new Date(),
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  };

  for (const field of Object.keys(patch) as Array<keyof ProgrammeDateSet>) {
    // Rayfin 1.34.0 serializes null as GraphQL null, while its generated entity
    // type models optional dates as Date | undefined. Keep the verified clear
    // representation at this SDK boundary rather than allowing undefined to be omitted.
    update[field] = patch[field] === null
      ? (null as unknown as Date)
      : patch[field];
  }

  await getRayfinClient().data.project_programme.update({ id: recordId }, update);
}

export async function resolveProjectReportingMappings(projectGuid: string) {
  const canonical = await ensureCanonicalReportingProgramme(projectGuid);
  const definitions = await listActiveProgrammeDefinitions();
  const records = canonical.records;
  const mappings = await listActiveReportingMappings();
  const ruleDefinitions = definitions.map((definition) => ({
    guid: definition.guid,
    programmeArea: definition.programme_area as ProgrammeArea,
    rowType: definition.row_type as ProgrammeRowType,
  }));
  const ruleRecords = records.map((record) => ({
    programmeItemDefinitionGuid: record.programme_item_definition_guid,
    targetStart: record.target_start,
    targetEnd: record.target_end,
    reportingStart: record.reporting_start,
    reportingEnd: record.reporting_end,
  }));
  return resolveReportingMappings(
    ruleDefinitions,
    ruleRecords,
    mappings.map((mapping) => ({
      guid: mapping.guid,
      reportingItemDefinitionGuid: mapping.reporting_item_definition_guid,
      reportingField: mapping.reporting_field,
      targetItemDefinitionGuid: mapping.target_item_definition_guid,
      targetField: mapping.target_field,
      reportingReferenceItemDefinitionGuid: mapping.reporting_reference_item_definition_guid,
      isActive: mapping.is_active,
    })),
  );
}
