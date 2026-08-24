import type { project_target_ddtc_detail } from "../../rayfin/data/project_target_ddtc_detail";
import type { project_target_stage_status } from "../../rayfin/data/project_target_stage_status";

import {
  buildTargetStageStates,

  TARGET_PROGRAMME_STAGES,
  type TargetStageCode,
  type TargetStageState,
} from "@/domain/targetProgrammeStages";
import {
  projectTargetProgrammeRows,
  validateDdtcPlanningStatus,
  validateTargetDateWrite,
  validateTargetStageStatus,
  type TargetProgrammeStageRow,
  type TargetProjectionInput,
} from "@/domain/targetProgramme";
import { parseDateOnly } from "@/domain/reportingProgramme";
import {
  evaluateTargetProgramme,
  type DependencyDefinition,
  type ProgrammeDateRecord,
  type ProgrammeRuleDefinition,
  type SummaryMembership,
} from "@/domain/programmeRules";
import {
  ensureProjectProgrammeRecord,
  listActiveDependencyDefinitions,
  listActiveProgrammeDefinitions,

  listActiveSummaryMembers,
  listProjectProgrammeRecords,
  resolveProjectReportingMappings,
  updateProjectProgrammeDates,
  type DependencyDefinitionRecord,
  type ProgrammeDefinitionRecord,
  type ProjectProgrammeRecord,
  type SummaryMemberRecord,
} from "./programmeService";
import { getRayfinClient } from "./rayfinClient";


export type TargetStageStatusRecord = Pick<
  project_target_stage_status,
  | "id"
  | "guid"
  | "project_guid"
  | "stage_code"
  | "rag_code"
  | "rag_comment"
  | "created_at"
  | "created_by_user_id"
  | "created_by_user_email"
  | "updated_at"
  | "updated_by_user_id"
  | "updated_by_user_email"
>;

export type TargetDdtcDetailRecord = Pick<
  project_target_ddtc_detail,
  | "id"
  | "guid"
  | "project_guid"
  | "planning_status_code"
  | "created_at"
  | "created_by_user_id"
  | "created_by_user_email"
  | "updated_at"
  | "updated_by_user_id"
  | "updated_by_user_email"
>;

export type TargetProgrammeStageWorkspace = {
  stage: TargetStageState;
  rows: TargetProgrammeStageRow[];
  stageStatus: TargetStageStatusRecord;
  ddtcDetail?: TargetDdtcDetailRecord;
};

const STATUS_FIELDS = [
  "id", "guid", "project_guid", "stage_code", "rag_code", "rag_comment",
  "created_at", "created_by_user_id", "created_by_user_email", "updated_at",
  "updated_by_user_id", "updated_by_user_email",
] as const;
const DDTC_DETAIL_FIELDS = [
  "id", "guid", "project_guid", "planning_status_code", "created_at",
  "created_by_user_id", "created_by_user_email", "updated_at",
  "updated_by_user_id", "updated_by_user_email",
] as const;


type CurrentUser = { id: string; email: string };

function getCurrentUser(): CurrentUser {
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error("You must be signed in to access Target Programme.");
  }
  return { id: session.user.id, email: session.user.email };
}

function ruleDefinitions(definitions: ProgrammeDefinitionRecord[]): ProgrammeRuleDefinition[] {
  return definitions.map((definition) => ({
    guid: definition.guid,
    programmeArea: definition.programme_area as "reporting" | "target",
    rowType: definition.row_type as ProgrammeRuleDefinition["rowType"],
  }));
}

function ruleRecords(records: ProjectProgrammeRecord[]): ProgrammeDateRecord[] {
  return records.map((record) => ({
    programmeItemDefinitionGuid: record.programme_item_definition_guid,
    targetStart: record.target_start,
    targetEnd: record.target_end,
    reportingStart: record.reporting_start,
    reportingEnd: record.reporting_end,
  }));
}

function ruleDependencies(records: DependencyDefinitionRecord[]): DependencyDefinition[] {
  return records.map((dependency) => ({
    guid: dependency.guid,
    predecessorItemDefinitionGuid: dependency.predecessor_item_definition_guid,
    successorItemDefinitionGuid: dependency.successor_item_definition_guid,
    dependencyType: dependency.dependency_type,
    lagDays: dependency.lag_days,
    successorField: dependency.successor_field,
    isActive: dependency.is_active,
  }));
}

function ruleMemberships(records: SummaryMemberRecord[]): SummaryMembership[] {
  return records.map((member) => ({
    guid: member.guid,
    summaryItemDefinitionGuid: member.summary_item_definition_guid,
    childItemDefinitionGuid: member.child_item_definition_guid,
    sortOrder: member.sort_order,
    isActive: member.is_active,
  }));
}


function fieldControllers(dependencies: DependencyDefinitionRecord[]): Set<string> {
  return new Set(dependencies.map((dependency) => `${dependency.successor_item_definition_guid}:${dependency.successor_field}`));
}


function assertKnownStage(stageCode: string): asserts stageCode is TargetStageCode {
  if (!TARGET_PROGRAMME_STAGES.some((stage) => stage.code === stageCode)) {
    throw new Error(`Unknown Target Programme stage: ${stageCode}`);
  }
}

function getStageState(stageCode: string, reportingStage: string): TargetStageState {
  assertKnownStage(stageCode);
  const state = buildTargetStageStates(reportingStage).find((stage) => stage.code === stageCode);
  if (!state) throw new Error(`Target Programme stage is unavailable: ${stageCode}`);
  return state;
}

function assertStageWriteable(stageCode: string, reportingStage: string): TargetStageState {
  const state = getStageState(stageCode, reportingStage);
  if (state.position !== "current" && state.position !== "future") {
    throw new Error("Previous or unmapped Target Programme stages are read-only.");
  }
  return state;
}

async function ensureStageStatus(projectGuid: string, stageCode: string): Promise<TargetStageStatusRecord> {
  assertKnownStage(stageCode);
  const client = getRayfinClient().data.project_target_stage_status;
  const existing = await client.select(STATUS_FIELDS)
    .where({ project_guid: { eq: projectGuid }, stage_code: { eq: stageCode } })
    .findFirst();
  if (existing) return existing;

  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();
  return client.create({
    id, guid: id, project_guid: projectGuid, stage_code: stageCode,
    created_at: now, created_by_user_id: user.id, created_by_user_email: user.email,
    updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email,
  });
}

export async function getOrEnsureTargetStageStatus(projectGuid: string, stageCode: string) {
  return ensureStageStatus(projectGuid, stageCode);
}

export async function updateTargetStageStatus(
  projectGuid: string,
  stageCode: string,
  reportingStage: string,
  patch: { ragCode?: string; ragComment?: string },
): Promise<TargetStageStatusRecord> {
  assertStageWriteable(stageCode, reportingStage);
  if (patch.ragCode !== undefined) validateTargetStageStatus(patch.ragCode);
  const current = await ensureStageStatus(projectGuid, stageCode);
  const user = getCurrentUser();
  const update: Record<string, unknown> = {
    updated_at: new Date(), updated_by_user_id: user.id, updated_by_user_email: user.email,
  };
  if (Object.prototype.hasOwnProperty.call(patch, "ragCode")) update.rag_code = patch.ragCode || null;
  if (Object.prototype.hasOwnProperty.call(patch, "ragComment")) update.rag_comment = patch.ragComment || null;
  return getRayfinClient().data.project_target_stage_status.update({ id: current.id }, update as never);
}

export async function getOrEnsureTargetDdtcDetail(projectGuid: string): Promise<TargetDdtcDetailRecord> {
  const client = getRayfinClient().data.project_target_ddtc_detail;
  const existing = await client.select(DDTC_DETAIL_FIELDS)
    .where({ project_guid: { eq: projectGuid } }).findFirst();
  if (existing) return existing;

  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();
  return client.create({
    id, guid: id, project_guid: projectGuid,
    created_at: now, created_by_user_id: user.id, created_by_user_email: user.email,
    updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email,
  });
}

export async function updateTargetDdtcDetail(
  projectGuid: string,
  reportingStage: string,
  planningStatusCode: string,
): Promise<TargetDdtcDetailRecord> {
  assertStageWriteable("ddtc", reportingStage);
  validateDdtcPlanningStatus(planningStatusCode);
  const current = await getOrEnsureTargetDdtcDetail(projectGuid);
  const user = getCurrentUser();
  return getRayfinClient().data.project_target_ddtc_detail.update({ id: current.id }, {
    planning_status_code: planningStatusCode || null,
    updated_at: new Date(), updated_by_user_id: user.id, updated_by_user_email: user.email,
  } as never);
}

export async function getTargetProgrammeStageWorkspace(
  projectGuid: string,
  stageCode: string,
  reportingStage: string,
): Promise<TargetProgrammeStageWorkspace> {
  const stage = getStageState(stageCode, reportingStage);
  const definitions = await listActiveProgrammeDefinitions({ programmeArea: "target" });
  const allDefinitions = await listActiveProgrammeDefinitions();
  const stageDefinitions = definitions.filter((definition) => definition.stage_code === stageCode);
  const authoritativeDefinitions = stageDefinitions.filter((definition) => ["activity", "milestone"].includes(definition.row_type));
  await Promise.all(authoritativeDefinitions.map((definition) => ensureProjectProgrammeRecord(projectGuid, definition.guid)));

  const records = await listProjectProgrammeRecords(projectGuid);
  const dependencies = await listActiveDependencyDefinitions();
  const memberships = await listActiveSummaryMembers();
  const mappingResolutions = await resolveProjectReportingMappings(projectGuid);
  const evaluation = evaluateTargetProgramme(
    ruleDefinitions(allDefinitions),
    ruleRecords(records),
    ruleDependencies(dependencies),
    ruleMemberships(memberships),
  );
  const effectiveRecords = new Map(evaluation.effectiveRecords.map((record) => [record.programmeItemDefinitionGuid, record]));
  const rawRecords = new Map(records.map((record) => [record.programme_item_definition_guid, record]));
  const controllers = fieldControllers(dependencies);
  const resolutionByReference = new Map<string, typeof mappingResolutions>();
  for (const resolution of mappingResolutions) {
    if (!resolution.reportingReferenceDefinition) continue;
    const list = resolutionByReference.get(resolution.reportingReferenceDefinition.guid) ?? [];
    list.push(resolution);
    resolutionByReference.set(resolution.reportingReferenceDefinition.guid, list);
  }

  const projectionInputs: TargetProjectionInput[] = stageDefinitions.map((definition) => {
    const effective = effectiveRecords.get(definition.guid);
    const summary = evaluation.summaryDates.get(definition.guid);
    const referenceResolutions = resolutionByReference.get(definition.guid) ?? [];
    return {
      definition: {
        guid: definition.guid,
        itemCode: definition.item_code,
        rowLabel: definition.row_label,
        rowType: definition.row_type as TargetProjectionInput["definition"]["rowType"],
        sortOrder: definition.sort_order,
        isEditable: definition.is_editable,
      },
      recordId: rawRecords.get(definition.guid)?.id,
      targetStart: effective?.targetStart,
      targetEnd: effective?.targetEnd,
      summaryStart: summary?.targetStart,
      summaryEnd: summary?.targetEnd,
      reportingReferenceStart: referenceResolutions.find((resolution) => resolution.reportingField === "reporting_start")?.reportingValue,
      reportingReferenceEnd: referenceResolutions.find((resolution) => resolution.reportingField === "reporting_end")?.reportingValue,
      startControlled: controllers.has(`${definition.guid}:target_start`),
      endControlled: controllers.has(`${definition.guid}:target_end`),
      stage,
    };
  });
  const rows = projectTargetProgrammeRows(projectionInputs);

  const stageStatus = await ensureStageStatus(projectGuid, stageCode);
  const ddtcDetail = stageCode === "ddtc" ? await getOrEnsureTargetDdtcDetail(projectGuid) : undefined;
  return { stage, rows, stageStatus, ddtcDetail };
}

export async function updateTargetProgrammeDate(
  projectGuid: string,
  stageCode: string,
  definitionGuid: string,
  field: "target_start" | "target_end",
  value: string,
  reportingStage: string,
): Promise<TargetProgrammeStageWorkspace> {
  assertStageWriteable(stageCode, reportingStage);
  const definitions = await listActiveProgrammeDefinitions();
  const definition = definitions.find((candidate) => candidate.guid === definitionGuid);
  if (!definition || definition.programme_area !== "target" || definition.stage_code !== stageCode) {
    throw new Error("Target definition is not active in the requested stage.");
  }
  const dependencies = await listActiveDependencyDefinitions();
  const record = await ensureProjectProgrammeRecord(projectGuid, definitionGuid);
  const records = await listProjectProgrammeRecords(projectGuid);
  const current = records.find((candidate) => candidate.id === record.id) ?? record;
  const parsed = value ? parseDateOnly(value) ?? null : null;
  validateTargetDateWrite({
    rowType: definition.row_type as "activity" | "milestone" | "summary" | "reporting_reference",
    definitionIsEditable: definition.is_editable,
    stageIsEditable: true,
    field,
    controlled: fieldControllers(dependencies).has(`${definitionGuid}:${field}`),
    value: parsed,
    currentStart: current.target_start,
    currentEnd: current.target_end,
  });
  await updateProjectProgrammeDates(record.id, { [field]: parsed });
  return getTargetProgrammeStageWorkspace(projectGuid, stageCode, reportingStage);
}
