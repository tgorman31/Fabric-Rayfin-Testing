import type { app_user_role } from "../../rayfin/data/app_user_role";
import type { programme_dependency_definition } from "../../rayfin/data/programme_dependency_definition";
import type { programme_item_definition } from "../../rayfin/data/programme_item_definition";
import type { programme_reporting_mapping } from "../../rayfin/data/programme_reporting_mapping";
import type { programme_summary_member } from "../../rayfin/data/programme_summary_member";

import { normalizeProgrammeAdminEmail } from "@/domain/programmeAdminAuth";
import {
  isProgrammeAdminRoleEffective,
  validateDefinitionCandidate,
  validateProgrammeConfiguration,
  type AdminDefinition,
  type ProgrammeConfiguration,
} from "@/domain/programmeAdminRules";
import { isLocalBackend, getRayfinClient } from "./rayfinClient";

const ROLE_FIELDS = ["user_email", "role_code", "active_flag", "effective_from", "effective_to"] as const;
const DEFINITION_FIELDS = [
  "id", "guid", "item_code", "programme_area", "stage_code", "row_label", "row_type",
  "sort_order", "level_code", "is_active", "is_editable", "is_derived", "effective_from",
  "effective_to", "created_at", "created_by_user_id", "created_by_user_email", "updated_at",
  "updated_by_user_id", "updated_by_user_email",
] as const;
const SUMMARY_FIELDS = [
  "id", "guid", "summary_item_definition_guid", "child_item_definition_guid", "sort_order",
  "is_active", "effective_from", "effective_to", "created_at", "created_by_user_id",
  "created_by_user_email", "updated_at", "updated_by_user_id", "updated_by_user_email",
] as const;
const DEPENDENCY_FIELDS = [
  "id", "guid", "predecessor_item_definition_guid", "successor_item_definition_guid", "dependency_type",
  "lag_days", "successor_field", "is_active", "effective_from", "effective_to", "created_at",
  "created_by_user_id", "created_by_user_email", "updated_at", "updated_by_user_id", "updated_by_user_email",
] as const;
/*
 * Security TODO: current v1 Admin service authorization protects normal
 * application writes, but programme configuration entities remain broadly
 * authenticated at the Rayfin data permission layer. Before production
 * hardening, replace that access with a trusted claim/role-backed Rayfin
 * @role policy once the supported Fabric Apps identity claim path is confirmed.
 */
const MAPPING_FIELDS = [
  "id", "guid", "reporting_item_definition_guid", "reporting_field", "target_item_definition_guid",
  "target_field", "reporting_reference_item_definition_guid", "is_active", "effective_from", "effective_to",
  "created_at", "created_by_user_id", "created_by_user_email", "updated_at", "updated_by_user_id", "updated_by_user_email",
] as const;

type RoleRecord = Pick<app_user_role, (typeof ROLE_FIELDS)[number]>;
export type ProgrammeAdminDefinition = Pick<programme_item_definition, (typeof DEFINITION_FIELDS)[number]>;
export type ProgrammeAdminSummaryMember = Pick<programme_summary_member, (typeof SUMMARY_FIELDS)[number]>;
export type ProgrammeAdminDependency = Pick<programme_dependency_definition, (typeof DEPENDENCY_FIELDS)[number]>;
export type ProgrammeAdminMapping = Pick<programme_reporting_mapping, (typeof MAPPING_FIELDS)[number]>;

export type ProgrammeAdminConfiguration = {
  definitions: ProgrammeAdminDefinition[];
  summaryMemberships: ProgrammeAdminSummaryMember[];
  dependencies: ProgrammeAdminDependency[];
  mappings: ProgrammeAdminMapping[];
};

export type ProgrammeDefinitionInput = Omit<AdminDefinition, "guid" | "id" | "isActive"> & {
  itemCode: string;
  isActive?: boolean;
};
export type SummaryMemberInput = Pick<ProgrammeAdminSummaryMember, "summary_item_definition_guid" | "child_item_definition_guid" | "sort_order">;
export type DependencyInput = Pick<ProgrammeAdminDependency, "predecessor_item_definition_guid" | "successor_item_definition_guid" | "dependency_type" | "lag_days" | "successor_field">;
export type MappingInput = Pick<ProgrammeAdminMapping, "reporting_item_definition_guid" | "reporting_field" | "target_item_definition_guid" | "target_field" | "reporting_reference_item_definition_guid">;


function getCurrentUser() {
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) throw new Error("You must be signed in to access Programme Admin.");
  return { id: session.user.id, email: session.user.email };
}

export async function getProgrammeAdminAccess(): Promise<boolean> {
  if (isLocalBackend()) return true;
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) return false;
  const roles = await getRayfinClient().data.app_user_role.select(ROLE_FIELDS)
    .where({ user_email: { eq: session.user.email } }).first(-1).execute();
  return roles.some((role: RoleRecord) => isProgrammeAdminRoleEffective({
    roleCode: role.role_code,
    activeFlag: role.active_flag,
    effectiveFrom: role.effective_from,
    effectiveTo: role.effective_to,
  }));
}

export async function assertProgrammeAdminAccess(): Promise<void> {
  if (!(await getProgrammeAdminAccess())) throw new Error("Programme Admin access is required.");
}

function bootstrapAuditUser(email: string): { id: string; email: string } {
  const session = getRayfinClient().auth.getSession();
  if (session.isAuthenticated && session.user) {
    return { id: session.user.id, email: session.user.email };
  }
  return { id: "programme-admin-bootstrap", email };
}

export async function ensureProgrammeAdminRole(email: string): Promise<RoleRecord> {
  const normalizedEmail = normalizeProgrammeAdminEmail(email);
  const matchingRoles = await getRayfinClient().data.app_user_role.select(ROLE_FIELDS)
    .where({ user_email: { eq: normalizedEmail }, role_code: { eq: "project_index_admin" } })
    .first(-1)
    .execute();
  const existing = matchingRoles.find((role: RoleRecord) => isProgrammeAdminRoleEffective({
    roleCode: role.role_code,
    activeFlag: role.active_flag,
    effectiveFrom: role.effective_from,
    effectiveTo: role.effective_to,
  }));
  if (existing) return existing;

  const operator = bootstrapAuditUser(normalizedEmail);
  const now = new Date();
  const effectiveFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const id = crypto.randomUUID();
  return getRayfinClient().data.app_user_role.create({
    id,
    guid: id,
    user_email: normalizedEmail,
    role_code: "project_index_admin",
    active_flag: true,
    effective_from: effectiveFrom,
    created_at: now,
    created_by_user_id: operator.id,
    created_by_user_email: operator.email,
  });
}

async function listDefinitions(includeRetired: boolean): Promise<ProgrammeAdminDefinition[]> {
  const client = getRayfinClient().data.programme_item_definition;
  if (!includeRetired) {
    return client.select(DEFINITION_FIELDS).where({ is_active: { eq: true } }).first(-1).execute();
  }
  const [active, retired] = await Promise.all([
    client.select(DEFINITION_FIELDS).where({ is_active: { eq: true } }).first(-1).execute(),
    client.select(DEFINITION_FIELDS).where({ is_active: { eq: false } }).first(-1).execute(),
  ]);
  return [...active, ...retired];
}

export async function listActiveProgrammeDefinitions(): Promise<ProgrammeAdminDefinition[]> {
  await assertProgrammeAdminAccess();
  return listDefinitions(false);
}

export async function listRetiredProgrammeDefinitions(): Promise<ProgrammeAdminDefinition[]> {
  await assertProgrammeAdminAccess();
  const definitions = await listDefinitions(true);
  return definitions.filter((definition) => !definition.is_active);
}

async function listActiveSummaryMembersInternal(): Promise<ProgrammeAdminSummaryMember[]> {
  return getRayfinClient().data.programme_summary_member.select(SUMMARY_FIELDS).where({ is_active: { eq: true } }).first(-1).execute();
}
export async function listActiveSummaryMemberships(): Promise<ProgrammeAdminSummaryMember[]> {
  await assertProgrammeAdminAccess();
  return listActiveSummaryMembersInternal();
}

async function listActiveDependenciesInternal(): Promise<ProgrammeAdminDependency[]> {
  return getRayfinClient().data.programme_dependency_definition.select(DEPENDENCY_FIELDS).where({ is_active: { eq: true } }).first(-1).execute();
}
export async function listActiveDependencies(): Promise<ProgrammeAdminDependency[]> {
  await assertProgrammeAdminAccess();
  return listActiveDependenciesInternal();
}

async function listActiveMappingsInternal(): Promise<ProgrammeAdminMapping[]> {
  return getRayfinClient().data.programme_reporting_mapping.select(MAPPING_FIELDS).where({ is_active: { eq: true } }).first(-1).execute();
}

export async function listActiveMappings(): Promise<ProgrammeAdminMapping[]> {
  await assertProgrammeAdminAccess();
  return listActiveMappingsInternal();
}

export async function loadProgrammeAdminConfiguration(): Promise<ProgrammeAdminConfiguration> {
  await assertProgrammeAdminAccess();
  const [definitions, summaryMemberships, dependencies, mappings] = await Promise.all([
    listDefinitions(true), listActiveSummaryMembersInternal(), listActiveDependenciesInternal(), listActiveMappingsInternal(),
  ]);
  return { definitions, summaryMemberships, dependencies, mappings };
}

async function activeConfiguration(): Promise<ProgrammeAdminConfiguration> {
  const [definitions, summaryMemberships, dependencies, mappings] = await Promise.all([
    listDefinitions(false), listActiveSummaryMembersInternal(), listActiveDependenciesInternal(), listActiveMappingsInternal(),
  ]);
  return { definitions, summaryMemberships, dependencies, mappings };
}

function toAdminDefinition(definition: ProgrammeAdminDefinition): AdminDefinition {
  return {
    id: definition.id,
    guid: definition.guid,
    itemCode: definition.item_code,
    programmeArea: definition.programme_area as AdminDefinition["programmeArea"],
    stageCode: definition.stage_code,
    rowLabel: definition.row_label,
    rowType: definition.row_type as AdminDefinition["rowType"],
    sortOrder: definition.sort_order,
    levelCode: definition.level_code,
    isEditable: definition.is_editable,
    isDerived: definition.is_derived,
    isActive: definition.is_active,
  };
}

function toConfiguration(configuration: ProgrammeAdminConfiguration): ProgrammeConfiguration {
  return {
    definitions: configuration.definitions.map(toAdminDefinition),
    summaryMemberships: configuration.summaryMemberships.map((item) => ({
      guid: item.guid,
      summaryItemDefinitionGuid: item.summary_item_definition_guid,
      childItemDefinitionGuid: item.child_item_definition_guid,
      sortOrder: item.sort_order,
      isActive: item.is_active,
    })),
    dependencies: configuration.dependencies.map((item) => ({
      guid: item.guid,
      predecessorItemDefinitionGuid: item.predecessor_item_definition_guid,
      successorItemDefinitionGuid: item.successor_item_definition_guid,
      dependencyType: item.dependency_type,
      lagDays: item.lag_days,
      successorField: item.successor_field,
      isActive: item.is_active,
    })),
    reportingMappings: configuration.mappings.map((item) => ({
      guid: item.guid,
      reportingItemDefinitionGuid: item.reporting_item_definition_guid,
      reportingField: item.reporting_field,
      targetItemDefinitionGuid: item.target_item_definition_guid,
      targetField: item.target_field,
      reportingReferenceItemDefinitionGuid: item.reporting_reference_item_definition_guid,
    })),
  };
}

function audit(user: { id: string; email: string }, now: Date) {
  return {
    updated_at: now,
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  };
}

export async function createProgrammeDefinition(input: ProgrammeDefinitionInput): Promise<ProgrammeAdminDefinition> {
  await assertProgrammeAdminAccess();
  const candidate: AdminDefinition = { ...input, guid: crypto.randomUUID(), isActive: true };
  validateDefinitionCandidate(candidate);
  const configuration = await activeConfiguration();
  validateProgrammeConfiguration({ ...toConfiguration(configuration), definitions: [...toConfiguration(configuration).definitions, candidate] });
  const user = getCurrentUser();
  const now = new Date();
  return getRayfinClient().data.programme_item_definition.create({
    id: candidate.guid, guid: candidate.guid, item_code: candidate.itemCode.trim(), programme_area: candidate.programmeArea,
    stage_code: candidate.stageCode, row_label: candidate.rowLabel.trim(), row_type: candidate.rowType, sort_order: candidate.sortOrder,
    level_code: candidate.levelCode?.trim() || undefined, is_active: true, is_editable: candidate.isEditable, is_derived: candidate.isDerived,
    effective_from: now, created_at: now, created_by_user_id: user.id, created_by_user_email: user.email,
    updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email,
  });
}

export type ProgrammeDefinitionUpdate = Partial<Omit<ProgrammeDefinitionInput, "itemCode">> & { itemCode?: string };

export async function updateProgrammeDefinition(id: string, input: ProgrammeDefinitionUpdate): Promise<ProgrammeAdminDefinition> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_item_definition.select(DEFINITION_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Programme definition not found.");
  const candidate = { ...toAdminDefinition(current), ...input, itemCode: input.itemCode ?? current.item_code } as AdminDefinition;
  validateDefinitionCandidate(candidate, toAdminDefinition(current));
  const configuration = await activeConfiguration();
  const config = toConfiguration(configuration);
  validateProgrammeConfiguration({ ...config, definitions: config.definitions.map((definition) => definition.guid === current.guid ? candidate : definition) });
  const user = getCurrentUser();
  const patch = {
    programme_area: candidate.programmeArea, stage_code: candidate.stageCode, row_label: candidate.rowLabel.trim(), row_type: candidate.rowType,
    sort_order: candidate.sortOrder, level_code: candidate.levelCode?.trim() || undefined, is_editable: candidate.isEditable,
    is_derived: candidate.isDerived, ...audit(user, new Date()),
  };
  return getRayfinClient().data.programme_item_definition.update({ id }, patch);
}

export async function retireProgrammeDefinition(id: string): Promise<void> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_item_definition.select(DEFINITION_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Programme definition not found.");
  const configuration = await activeConfiguration();
  const config = toConfiguration(configuration);
  validateProgrammeConfiguration({ ...config, definitions: config.definitions.filter((definition) => definition.guid !== current.guid) });
  const user = getCurrentUser();
  const now = new Date();
  await getRayfinClient().data.programme_item_definition.update({ id }, { is_active: false, effective_to: now, ...audit(user, now) });
}

async function validateRelationshipConfiguration(configuration: ProgrammeAdminConfiguration): Promise<void> {
  validateProgrammeConfiguration(toConfiguration(configuration));
}

export async function createSummaryMembership(input: SummaryMemberInput): Promise<ProgrammeAdminSummaryMember> {
  await assertProgrammeAdminAccess();
  const configuration = await activeConfiguration();
  const item = { guid: crypto.randomUUID(), summaryItemDefinitionGuid: input.summary_item_definition_guid, childItemDefinitionGuid: input.child_item_definition_guid, sortOrder: input.sort_order, isActive: true };
  await validateRelationshipConfiguration({ ...configuration, summaryMemberships: [...configuration.summaryMemberships, { ...input, id: item.guid, guid: item.guid, is_active: true } as ProgrammeAdminSummaryMember] });
  const user = getCurrentUser(); const now = new Date();
  return getRayfinClient().data.programme_summary_member.create({ id: item.guid, guid: item.guid, summary_item_definition_guid: input.summary_item_definition_guid, child_item_definition_guid: input.child_item_definition_guid, sort_order: input.sort_order, is_active: true, effective_from: now, created_at: now, created_by_user_id: user.id, created_by_user_email: user.email, updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email });
}

export async function updateSummaryMembership(id: string, sortOrder: number): Promise<ProgrammeAdminSummaryMember> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_summary_member.select(SUMMARY_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Summary membership not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, summaryMemberships: configuration.summaryMemberships.map((item) => item.id === id ? { ...item, sort_order: sortOrder } : item) });
  const user = getCurrentUser();
  return getRayfinClient().data.programme_summary_member.update({ id }, { sort_order: sortOrder, ...audit(user, new Date()) });
}

export async function retireSummaryMembership(id: string): Promise<void> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_summary_member.select(SUMMARY_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Summary membership not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, summaryMemberships: configuration.summaryMemberships.filter((item) => item.id !== id) });
  const user = getCurrentUser(); const now = new Date();
  await getRayfinClient().data.programme_summary_member.update({ id }, { is_active: false, effective_to: now, ...audit(user, now) });
}

export async function createDependency(input: DependencyInput): Promise<ProgrammeAdminDependency> {
  await assertProgrammeAdminAccess();
  const configuration = await activeConfiguration();
  const id = crypto.randomUUID();
  await validateRelationshipConfiguration({ ...configuration, dependencies: [...configuration.dependencies, { ...input, id, guid: id, is_active: true } as ProgrammeAdminDependency] });
  const user = getCurrentUser(); const now = new Date();
  return getRayfinClient().data.programme_dependency_definition.create({ id, guid: id, ...input, is_active: true, effective_from: now, created_at: now, created_by_user_id: user.id, created_by_user_email: user.email, updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email });
}

export async function updateDependency(id: string, input: DependencyInput): Promise<ProgrammeAdminDependency> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_dependency_definition.select(DEPENDENCY_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Dependency definition not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, dependencies: configuration.dependencies.map((item) => item.id === id ? { ...item, ...input } : item) });
  const user = getCurrentUser();
  return getRayfinClient().data.programme_dependency_definition.update({ id }, { ...input, ...audit(user, new Date()) });
}

export async function retireDependency(id: string): Promise<void> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_dependency_definition.select(DEPENDENCY_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Dependency definition not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, dependencies: configuration.dependencies.filter((item) => item.id !== id) });
  const user = getCurrentUser(); const now = new Date();
  await getRayfinClient().data.programme_dependency_definition.update({ id }, { is_active: false, effective_to: now, ...audit(user, now) });
}

export async function createMapping(input: MappingInput): Promise<ProgrammeAdminMapping> {
  await assertProgrammeAdminAccess();
  const configuration = await activeConfiguration();
  const id = crypto.randomUUID();
  await validateRelationshipConfiguration({ ...configuration, mappings: [...configuration.mappings, { ...input, id, guid: id, is_active: true } as ProgrammeAdminMapping] });
  const user = getCurrentUser(); const now = new Date();
  return getRayfinClient().data.programme_reporting_mapping.create({ id, guid: id, ...input, is_active: true, effective_from: now, created_at: now, created_by_user_id: user.id, created_by_user_email: user.email, updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email });
}

export async function updateMapping(id: string, input: MappingInput): Promise<ProgrammeAdminMapping> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_reporting_mapping.select(MAPPING_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Reporting mapping not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, mappings: configuration.mappings.map((item) => item.id === id ? { ...item, ...input } : item) });
  const user = getCurrentUser();
  return getRayfinClient().data.programme_reporting_mapping.update({ id }, { ...input, ...audit(user, new Date()) });
}

export async function retireMapping(id: string): Promise<void> {
  await assertProgrammeAdminAccess();
  const current = await getRayfinClient().data.programme_reporting_mapping.select(MAPPING_FIELDS).where({ id: { eq: id } }).findFirst();
  if (!current) throw new Error("Reporting mapping not found.");
  const configuration = await activeConfiguration();
  await validateRelationshipConfiguration({ ...configuration, mappings: configuration.mappings.filter((item) => item.id !== id) });
  const user = getCurrentUser(); const now = new Date();
  await getRayfinClient().data.programme_reporting_mapping.update({ id }, { is_active: false, effective_to: now, ...audit(user, now) });
}
