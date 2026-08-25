import type { master_project_register } from "../../rayfin/data/master_project_register";
import type { project_index_summary } from "../../rayfin/data/project_index_summary";
import type { project_target_ddtc_detail } from "../../rayfin/data/project_target_ddtc_detail";
import type { project_target_planning_detail } from "../../rayfin/data/project_target_planning_detail";
import type { project_target_stage_status } from "../../rayfin/data/project_target_stage_status";

import {
  buildTargetStageStates,

  TARGET_PROGRAMME_STAGES,
  type TargetStageCode,
  type TargetStageState,
} from "@/domain/targetProgrammeStages";
import {
  projectTargetProgrammeRows,
  selectSingleLogicalRecord,
  validateDdtcPlanningStatus,
  validateTargetDateWrite,
  validateTargetStageStatus,
  type TargetProgrammeStageRow,
  type TargetProjectionInput,
} from "@/domain/targetProgramme";
import {
  dateOnlyKey,
  mapCanonicalReportingView,
  parseDateOnly,
  sortReportingDefinitions,
} from "@/domain/reportingProgramme";
import {
  evaluateTargetProgramme,
  resolveReportingMappings,
  type DependencyDefinition,
  type ProgrammeDateRecord,
  type ProgrammeRuleDefinition,
  type SummaryMembership,
} from "@/domain/programmeRules";
import {
  ensureCanonicalReportingProgramme,
  ensureProjectProgrammeRecord,
  listActiveDependencyDefinitions,
  listActiveProgrammeDefinitions,
  listActiveReportingMappings,
  listActiveSummaryMembers,
  listProjectProgrammeRecords,
  updateProjectProgrammeDates,
  type DependencyDefinitionRecord,
  type ProgrammeDefinitionRecord,
  type ProjectProgrammeRecord,
  type ReportingMappingRecord,
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

export type TargetPlanningDetailRecord = Pick<
  project_target_planning_detail,
  | "id"
  | "guid"
  | "project_guid"
  | "advancing_gateway4_code"
  | "planning_granted_code"
  | "partial_advance_g4_name"
  | "partial_advance_g4_homes"
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

export type ProjectProgrammeClientState = {
  definitions: ProgrammeDefinitionRecord[];
  records: ProjectProgrammeRecord[];
  summaryMembers: SummaryMemberRecord[];
  dependencies: DependencyDefinitionRecord[];
  reportingMappings: ReportingMappingRecord[];
  stageStatuses: TargetStageStatusRecord[];
  ddtcDetail?: TargetDdtcDetailRecord;
  planningDetail?: TargetPlanningDetailRecord;
};

export type TargetProgrammeStageWorkspace = {
  stage: TargetStageState;
  rows: TargetProgrammeStageRow[];
  stageStatus?: TargetStageStatusRecord;
  ddtcDetail?: TargetDdtcDetailRecord;
  planningDetail?: TargetPlanningDetailRecord;
};

export type ReportingProgrammeProjection = ReturnType<typeof mapCanonicalReportingView>;

const STATUS_FIELDS = [
  "id", "guid", "project_guid", "stage_code", "rag_code", "rag_comment",
  "created_at", "created_by_user_id", "created_by_user_email", "updated_at",
  "updated_by_user_id", "updated_by_user_email",
] as const;
const PLANNING_DETAIL_FIELDS = [
  "id", "guid", "project_guid", "advancing_gateway4_code", "planning_granted_code",
  "partial_advance_g4_name", "partial_advance_g4_homes", "created_at", "created_by_user_id",
  "created_by_user_email", "updated_at", "updated_by_user_id", "updated_by_user_email",
] as const;
const DDTC_DETAIL_FIELDS = [
  "id", "guid", "project_guid", "planning_status_code", "created_at",
  "created_by_user_id", "created_by_user_email", "updated_at",
  "updated_by_user_id", "updated_by_user_email",
] as const;
const ACTIVE_PROJECT_FIELDS = ["guid", "effective_to"] as const;
const PROJECT_SUMMARY_FIELDS = ["project_guid", "reporting_stage_code"] as const;
const ACTIVE_EFFECTIVE_TO = "2099-12-31";

export function shouldInitializeImplementedTarget(effectiveTo: Date | undefined): boolean {
  return dateOnlyKey(effectiveTo) === ACTIVE_EFFECTIVE_TO;
}

type CurrentUser = { id: string; email: string };
type ProjectProgrammeContext = { projectGuid: string; reportingStage: string };

function getCurrentUser(): CurrentUser {
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error("You must be signed in to access Target Programme.");
  }
  return { id: session.user.id, email: session.user.email };
}

async function getPersistedProjectContext(projectGuid: string): Promise<ProjectProgrammeContext> {
  const project = await getRayfinClient().data.master_project_register
    .select(ACTIVE_PROJECT_FIELDS)
    .where({ guid: { eq: projectGuid } })
    .findFirst() as Pick<master_project_register, "guid" | "effective_to"> | null;
  if (!project || dateOnlyKey(project.effective_to) !== ACTIVE_EFFECTIVE_TO) {
    throw new Error("Target Programme writes require an active project.");
  }
  const summary = await getRayfinClient().data.project_index_summary
    .select(PROJECT_SUMMARY_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .findFirst() as Pick<project_index_summary, "project_guid" | "reporting_stage_code"> | null;
  return { projectGuid, reportingStage: summary?.reporting_stage_code ?? "" };
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


function ruleMappings(records: ReportingMappingRecord[]) {
  return records.map((mapping) => ({
    guid: mapping.guid,
    reportingItemDefinitionGuid: mapping.reporting_item_definition_guid,
    reportingField: mapping.reporting_field,
    targetItemDefinitionGuid: mapping.target_item_definition_guid,
    targetField: mapping.target_field,
    reportingReferenceItemDefinitionGuid: mapping.reporting_reference_item_definition_guid,
    isActive: mapping.is_active,
  }));
}

function fieldControllers(dependencies: DependencyDefinitionRecord[]): Set<string> {
  return new Set(dependencies.map((dependency) => `${dependency.successor_item_definition_guid}:${dependency.successor_field}`));
}


function stateMappingResolutions(state: ProjectProgrammeClientState) {
  return resolveReportingMappings(
    ruleDefinitions(state.definitions),
    ruleRecords(state.records),
    ruleMappings(state.reportingMappings),
  );
}

function stateEvaluation(state: ProjectProgrammeClientState) {
  return evaluateTargetProgramme(
    ruleDefinitions(state.definitions),
    ruleRecords(state.records),
    ruleDependencies(state.dependencies),
    ruleMemberships(state.summaryMembers),
  );
}

export function projectReportingProgrammeRows(
  state: ProjectProgrammeClientState,
): ReportingProgrammeProjection[] {
  const definitions = sortReportingDefinitions(
    state.definitions.filter((definition) => definition.programme_area === "reporting"),
  );
  const records = new Map(state.records.map((record) => [record.programme_item_definition_guid, record]));
  return definitions
    .map((definition) => {
      const record = records.get(definition.guid);
      return record ? mapCanonicalReportingView(definition, record) : undefined;
    })
    .filter((row): row is ReportingProgrammeProjection => Boolean(row));
}

export function isImplementedTargetStage(stageCode: string): stageCode is "planning" | "ddtc" {
  return stageCode === "planning" || stageCode === "ddtc";
}

export function isImplementedTargetOperationalDefinition(
  definition: Pick<ProgrammeDefinitionRecord, "programme_area" | "stage_code" | "row_type">,
): boolean {
  return definition.programme_area === "target"
    && (definition.stage_code === "planning" || definition.stage_code === "ddtc")
    && (definition.row_type === "activity" || definition.row_type === "milestone");
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

export function projectTargetProgrammeStageWorkspace(
  state: ProjectProgrammeClientState,
  reportingStage: string,
  stageCode: string,
  options: { projectIsEditable?: boolean } = {},
): TargetProgrammeStageWorkspace {
  const stage = getStageState(stageCode, reportingStage);
  const stageDefinitions = state.definitions.filter(
    (definition) => definition.programme_area === "target" && definition.stage_code === stageCode,
  );
  const records = new Map(state.records.map((record) => [record.programme_item_definition_guid, record]));
  const evaluation = stateEvaluation(state);
  const effectiveRecords = new Map(evaluation.effectiveRecords.map((record) => [record.programmeItemDefinitionGuid, record]));
  const controllers = fieldControllers(state.dependencies);
  const mappingResolutions = stateMappingResolutions(state);
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
      recordId: records.get(definition.guid)?.id,
      targetStart: effective?.targetStart,
      targetEnd: effective?.targetEnd,
      summaryStart: summary?.targetStart,
      summaryEnd: summary?.targetEnd,
      reportingReferenceStart: referenceResolutions.find((resolution) => resolution.reportingField === "reporting_start")?.reportingValue,
      reportingReferenceEnd: referenceResolutions.find((resolution) => resolution.reportingField === "reporting_end")?.reportingValue,
      startControlled: controllers.has(`${definition.guid}:target_start`),
      endControlled: controllers.has(`${definition.guid}:target_end`),
      projectIsEditable: options.projectIsEditable,
      stage,
    };
  });
  const stageStatus = state.stageStatuses.find((status) => status.stage_code === stageCode);
  return {
    stage,
    rows: projectTargetProgrammeRows(projectionInputs),
    stageStatus,
    ddtcDetail: stageCode === "ddtc" ? state.ddtcDetail : undefined,
    planningDetail: stageCode === "planning" ? state.planningDetail : undefined,
  };
}

async function ensureStageStatus(projectGuid: string, stageCode: string): Promise<TargetStageStatusRecord> {
  assertKnownStage(stageCode);
  const client = getRayfinClient().data.project_target_stage_status;
  const existing = await client.select(STATUS_FIELDS)
    .where({ project_guid: { eq: projectGuid }, stage_code: { eq: stageCode } })
    .first(-1)
    .execute();
  const existingRecord = selectSingleLogicalRecord(existing, `Target stage status for ${projectGuid}/${stageCode}`);
  if (existingRecord) return existingRecord;

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
  patch: { ragCode?: string; ragComment?: string },
): Promise<TargetStageStatusRecord> {
  const context = await getPersistedProjectContext(projectGuid);
  assertStageWriteable(stageCode, context.reportingStage);
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

async function listTargetStageStatuses(projectGuid: string): Promise<TargetStageStatusRecord[]> {
  return getRayfinClient().data.project_target_stage_status
    .select(STATUS_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();
}

async function getExistingTargetDdtcDetail(projectGuid: string): Promise<TargetDdtcDetailRecord | undefined> {
  const existing = await getRayfinClient().data.project_target_ddtc_detail
    .select(DDTC_DETAIL_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();
  return selectSingleLogicalRecord(existing, `DDTC detail for ${projectGuid}`) ?? undefined;
}

export async function getOrEnsureTargetDdtcDetail(projectGuid: string): Promise<TargetDdtcDetailRecord> {
  const existingRecord = await getExistingTargetDdtcDetail(projectGuid);
  if (existingRecord) return existingRecord;

  const client = getRayfinClient().data.project_target_ddtc_detail;
  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();
  return client.create({
    id, guid: id, project_guid: projectGuid,
    created_at: now, created_by_user_id: user.id, created_by_user_email: user.email,
    updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email,
  });
}

async function getExistingTargetPlanningDetail(projectGuid: string): Promise<TargetPlanningDetailRecord | undefined> {
  const existing = await getRayfinClient().data.project_target_planning_detail
    .select(PLANNING_DETAIL_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();
  return selectSingleLogicalRecord(existing, `Planning detail for ${projectGuid}`) ?? undefined;
}

export async function getOrEnsureTargetPlanningDetail(projectGuid: string): Promise<TargetPlanningDetailRecord> {
  const existing = await getExistingTargetPlanningDetail(projectGuid);
  if (existing) return existing;
  const client = getRayfinClient().data.project_target_planning_detail;
  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();
  return client.create({
    id, guid: id, project_guid: projectGuid,
    created_at: now, created_by_user_id: user.id, created_by_user_email: user.email,
    updated_at: now, updated_by_user_id: user.id, updated_by_user_email: user.email,
  } as never);
}

export type TargetPlanningDetailPatch = {
  advancingGateway4Code?: string;
  planningGrantedCode?: string;
  partialAdvanceG4Name?: string;
  partialAdvanceG4Homes?: number | null;
};

export function validateTargetPlanningDetailPatch(patch: TargetPlanningDetailPatch): void {
  if (patch.advancingGateway4Code !== undefined && !["", "Yes", "No", "Yes (Partial)"].includes(patch.advancingGateway4Code)) {
    throw new Error("Advancing Gateway 4? must be blank, Yes, No, or Yes (Partial).");
  }
  if (patch.planningGrantedCode !== undefined && !["", "Yes", "No"].includes(patch.planningGrantedCode)) {
    throw new Error("Planning Granted? must be blank, Yes, or No.");
  }
  if (patch.partialAdvanceG4Homes !== undefined && patch.partialAdvanceG4Homes !== null
    && (!Number.isInteger(patch.partialAdvanceG4Homes) || patch.partialAdvanceG4Homes < 0)) {
    throw new Error("Partial Advance G4: # Homes must be a non-negative whole number or blank.");
  }
}

export async function updateTargetPlanningDetail(
  projectGuid: string,
  patch: TargetPlanningDetailPatch,
): Promise<TargetPlanningDetailRecord> {
  const context = await getPersistedProjectContext(projectGuid);
  assertStageWriteable("planning", context.reportingStage);
  validateTargetPlanningDetailPatch(patch);
  if (Object.keys(patch).length === 0) throw new Error("At least one Planning detail field must be supplied.");
  const current = await getOrEnsureTargetPlanningDetail(projectGuid);
  const user = getCurrentUser();
  const update: Record<string, unknown> = {
    updated_at: new Date(), updated_by_user_id: user.id, updated_by_user_email: user.email,
  };
  if (Object.prototype.hasOwnProperty.call(patch, "advancingGateway4Code")) update.advancing_gateway4_code = patch.advancingGateway4Code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "planningGrantedCode")) update.planning_granted_code = patch.planningGrantedCode || null;
  if (Object.prototype.hasOwnProperty.call(patch, "partialAdvanceG4Name")) update.partial_advance_g4_name = patch.partialAdvanceG4Name || null;
  if (Object.prototype.hasOwnProperty.call(patch, "partialAdvanceG4Homes")) update.partial_advance_g4_homes = patch.partialAdvanceG4Homes ?? null;
  return getRayfinClient().data.project_target_planning_detail.update({ id: current.id }, update as never);
}

export async function updateTargetDdtcDetail(
  projectGuid: string,
  planningStatusCode: string,
): Promise<TargetDdtcDetailRecord> {
  const context = await getPersistedProjectContext(projectGuid);
  assertStageWriteable("ddtc", context.reportingStage);
  validateDdtcPlanningStatus(planningStatusCode);
  const current = await getOrEnsureTargetDdtcDetail(projectGuid);
  const user = getCurrentUser();
  return getRayfinClient().data.project_target_ddtc_detail.update({ id: current.id }, {
    planning_status_code: planningStatusCode || null,
    updated_at: new Date(), updated_by_user_id: user.id, updated_by_user_email: user.email,
  } as never);
}

export async function loadProjectProgrammeClientState(
  projectGuid: string,
  options: { initializeImplementedTarget?: boolean } = {},
): Promise<ProjectProgrammeClientState> {
  await ensureCanonicalReportingProgramme(projectGuid);
  const definitions = await listActiveProgrammeDefinitions();
  const initializeImplementedTarget = options.initializeImplementedTarget ?? true;
  const operationalTargetDefinitions = initializeImplementedTarget
    ? definitions.filter(isImplementedTargetOperationalDefinition)
    : [];
  if (initializeImplementedTarget) {
    await Promise.all(operationalTargetDefinitions.map((definition) =>
      ensureProjectProgrammeRecord(projectGuid, definition.guid),
    ));
  }
  const [records, summaryMembers, dependencies, reportingMappings, ddtcDetail, planningDetail] = await Promise.all([
    listProjectProgrammeRecords(projectGuid),
    listActiveSummaryMembers(),
    listActiveDependencyDefinitions(),
    listActiveReportingMappings(),
    initializeImplementedTarget ? getOrEnsureTargetDdtcDetail(projectGuid) : getExistingTargetDdtcDetail(projectGuid),
    initializeImplementedTarget ? getOrEnsureTargetPlanningDetail(projectGuid) : getExistingTargetPlanningDetail(projectGuid),
  ]);
  const [ddtcStatus, planningStatus] = initializeImplementedTarget
    ? await Promise.all([ensureStageStatus(projectGuid, "ddtc"), ensureStageStatus(projectGuid, "planning")])
    : [undefined, undefined];
  const stageStatuses = await listTargetStageStatuses(projectGuid);
  return {
    definitions,
    records,
    summaryMembers,
    dependencies,
    reportingMappings,
    stageStatuses: [ddtcStatus, planningStatus].filter((status): status is TargetStageStatusRecord => Boolean(status))
      .reduce((statuses, status) => statuses.some((existing) => existing.guid === status.guid) ? statuses : [...statuses, status], stageStatuses),
    ddtcDetail,
    planningDetail,
  };
}

export async function getTargetProgrammeStageWorkspace(
  projectGuid: string,
  stageCode: string,
): Promise<TargetProgrammeStageWorkspace> {
  const context = await getPersistedProjectContext(projectGuid);
  const state = await loadProjectProgrammeClientState(projectGuid);
  return projectTargetProgrammeStageWorkspace(state, context.reportingStage, stageCode);
}

export async function updateTargetProgrammeDate(
  projectGuid: string,
  stageCode: string,
  definitionGuid: string,
  field: "target_start" | "target_end",
  value: string,
): Promise<void> {
  return updateTargetProgrammeDates(projectGuid, stageCode, definitionGuid, {
    [field]: value,
  });
}

export async function updateTargetProgrammeDates(
  projectGuid: string,
  stageCode: string,
  definitionGuid: string,
  patch: { target_start?: string; target_end?: string },
): Promise<void> {
  const context = await getPersistedProjectContext(projectGuid);
  assertStageWriteable(stageCode, context.reportingStage);
  const definitions = await listActiveProgrammeDefinitions();
  const definition = definitions.find((candidate) => candidate.guid === definitionGuid);
  if (!definition || definition.programme_area !== "target" || definition.stage_code !== stageCode) {
    throw new Error("Target definition is not active in the requested stage.");
  }
  if (Object.keys(patch).length === 0) throw new Error("At least one Target date must be supplied.");
  const dependencies = await listActiveDependencyDefinitions();
  const records = await listProjectProgrammeRecords(projectGuid);
  const current = records.find((candidate) => candidate.programme_item_definition_guid === definitionGuid);
  const parsedPatch: { target_start?: Date | null; target_end?: Date | null } = {};
  if (Object.prototype.hasOwnProperty.call(patch, "target_start")) {
    parsedPatch.target_start = patch.target_start ? parseDateOnly(patch.target_start) ?? null : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "target_end")) {
    parsedPatch.target_end = patch.target_end ? parseDateOnly(patch.target_end) ?? null : null;
  }
  const rowType = definition.row_type as "activity" | "milestone" | "summary" | "reporting_reference";
  for (const field of Object.keys(parsedPatch) as Array<"target_start" | "target_end">) {
    validateTargetDateWrite({
      rowType,
      definitionIsEditable: definition.is_editable,
      stageIsEditable: true,
      field,
      controlled: fieldControllers(dependencies).has(`${definitionGuid}:${field}`),
      value: parsedPatch[field] ?? null,
      currentStart: Object.prototype.hasOwnProperty.call(parsedPatch, "target_start") ? parsedPatch.target_start ?? null : current?.target_start,
      currentEnd: Object.prototype.hasOwnProperty.call(parsedPatch, "target_end") ? parsedPatch.target_end ?? null : current?.target_end,
    });
  }
  const record = await ensureProjectProgrammeRecord(projectGuid, definitionGuid);
  await updateProjectProgrammeDates(record.id, parsedPatch);
}
