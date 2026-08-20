import type { master_project_register } from "../../rayfin/data/master_project_register";
import type { master_site_register } from "../../rayfin/data/master_site_register";
import type { project_index_summary } from "../../rayfin/data/project_index_summary";
import type { project_reporting_programme_item } from "../../rayfin/data/project_reporting_programme_item";
import type { project_team_member } from "../../rayfin/data/project_team_member";

import { getRayfinClient, isLocalBackend } from "./rayfinClient";

const ACTIVE_EFFECTIVE_TO = "2099-12-31";
const PROJECT_FIELDS = [
  "id",
  "guid",
  "parent_guid",
  "root_guid",
  "project_ref",
  "site_guid",
  "effective_from",
  "effective_to",
  "created_by_user_email",
] as const;
const SITE_FIELDS = ["guid", "site_code"] as const;
const SUMMARY_FIELDS = [
  "id",
  "guid",
  "project_guid",
  "project_ref",
  "project_name",
  "gateway_code",
  "reporting_stage_code",
  "sub_stage_code",
  "project_status_code",
  "reporting_status_code",
  "phase_number",
  "local_authority_code",
  "origin_of_land_code",
  "project_description",
  "map_link",
  "created_at",
  "created_by_user_id",
  "created_by_user_email",
  "updated_at",
  "updated_by_user_id",
  "updated_by_user_email",
] as const;
const TEAM_FIELDS = [
  "id",
  "guid",
  "project_guid",
  "person_name",
  "staff_identifier",
  "directory_object_id",
  "entry_mode",
  "is_unverified",
  "staff_role_code",
  "team_code",
  "is_responsible_manager",
  "last_reviewed_at",
  "created_at",
  "created_by_user_id",
  "created_by_user_email",
  "updated_at",
  "updated_by_user_id",
  "updated_by_user_email",
] as const;
const REPORTING_FIELDS = [
  "id",
  "guid",
  "project_guid",
  "section_code",
  "row_code",
  "row_label",
  "level_code",
  "sort_order",
  "is_editable",
  "start_date",
  "end_date",
  "reporting_date",
  "reference_rag_code",
  "reference_rag_comment",
  "created_at",
  "created_by_user_id",
  "created_by_user_email",
  "updated_at",
  "updated_by_user_id",
  "updated_by_user_email",
] as const;
const USER_ROLE_FIELDS = [
  "user_email",
  "role_code",
  "active_flag",
  "effective_from",
  "effective_to",
] as const;

const gatewayOptions = ["Gateway 1", "Gateway 2", "Gateway 3", "Gateway 4"];
const reportingStageOptions = [
  "Land Activation",
  "Site Pipeline",
  "Planning",
  "Detailed Design / Tender / Contract",
  "Construction",
];
const subStageOptions = [
  "Early",
  "Active",
  "Review",
  "Complete",
];
const projectStatusOptions = ["On Track", "At Risk", "On Hold", "Complete"];
const reportingStatusOptions = ["Draft", "In Progress", "Ready", "Submitted"];
const localAuthorityOptions = [
  "Barnet",
  "Camden",
  "Croydon",
  "Ealing",
  "Greenwich",
  "Southwark",
  "Westminster",
];
const originOfLandOptions = [
  "Acquisition",
  "Council",
  "Developer Partner",
  "Public Sector",
  "Private Sector",
];
const staffRoleOptions = [
  "Development Manager",
  "Project Manager",
  "Programme Lead",
  "Commercial Lead",
  "Planning Lead",
];
const teamOptions = [
  "Development",
  "Planning",
  "Commercial",
  "Construction",
  "Programme",
];

const reportingProgrammeSeed = [
  {
    sectionCode: "land-activation",
    sectionLabel: "Land Activation",
    items: [
      { rowCode: "la-opportunity", rowLabel: "Opportunity identified", levelCode: "O", isEditable: true },
      { rowCode: "la-agreement", rowLabel: "Heads of terms agreed", levelCode: "E", isEditable: true },
      { rowCode: "la-transfer", rowLabel: "Transfer to property", levelCode: "B", isEditable: true },
    ],
  },
  {
    sectionCode: "site-pipeline",
    sectionLabel: "Site Pipeline",
    items: [
      { rowCode: "sp-g1", rowLabel: "Gateway 1", levelCode: "B", isEditable: true },
      { rowCode: "sp-g2", rowLabel: "Gateway 2", levelCode: "E", isEditable: true },
      { rowCode: "sp-homes", rowLabel: "Homes total", levelCode: "O", isEditable: false },
    ],
  },
  {
    sectionCode: "planning",
    sectionLabel: "Planning",
    items: [
      { rowCode: "pl-preapp", rowLabel: "Pre-app engagement", levelCode: "P", isEditable: true },
      { rowCode: "pl-submit", rowLabel: "Planning submitted", levelCode: "E", isEditable: true },
      { rowCode: "pl-granted", rowLabel: "Planning granted", levelCode: "B", isEditable: true },
    ],
  },
  {
    sectionCode: "ddtc",
    sectionLabel: "Detailed Design / Tender / Contract",
    items: [
      { rowCode: "ddtc-design", rowLabel: "Detailed design complete", levelCode: "O", isEditable: true },
      { rowCode: "ddtc-tender", rowLabel: "Tender return", levelCode: "E", isEditable: true },
      { rowCode: "ddtc-contract", rowLabel: "Contract award", levelCode: "B", isEditable: true },
    ],
  },
  {
    sectionCode: "construction",
    sectionLabel: "Construction",
    items: [
      { rowCode: "co-start", rowLabel: "Start on site", levelCode: "B", isEditable: true },
      { rowCode: "co-mid", rowLabel: "Mid-stage delivery review", levelCode: "O", isEditable: true },
      { rowCode: "co-complete", rowLabel: "Completion / handover", levelCode: "B", isEditable: true },
    ],
  },
] as const;

type AuthenticatedUser = {
  id: string;
  email: string;
};

type ProjectRecord = master_project_register;
type SiteRecord = master_site_register;
type SummaryRecord = project_index_summary;
type TeamRecord = project_team_member;
type ReportingRecord = project_reporting_programme_item;

export type SaveState = "idle" | "saving" | "saved" | "error";

export type ProjectListItem = {
  projectGuid: string;
  projectRef: string;
  siteCode: string;
  gateway: string;
  reportingStage: string;
  projectStatus: string;
  reportingStatus: string;
  responsibleManager: string;
  lastUpdated: string;
  isActive: boolean;
  rootGuid: string;
  currentProjectGuid: string;
  currentProjectRef: string;
};

export type ProjectSummary = {
  projectGuid: string;
  projectRef: string;
  projectName: string;
  gateway: string;
  reportingStage: string;
  subStage: string;
  projectStatus: string;
  reportingStatus: string;
  siteCode: string;
  planningCode: string;
  contractCode: string | null;
  phaseNumber: number | "";
  localAuthority: string;
  originOfLand: string;
  projectDescription: string;
  mapLink: string;
  lastEditedBy: string;
  lastUpdatedAt: string;
};

export type ProjectTeamMemberDraft = {
  id: string;
  personName: string;
  staffIdentifier: string;
  entryMode: "directory" | "free_text";
  isUnverified: boolean;
  staffRole: string;
  team: string;
  isResponsibleManager: boolean;
  lastReviewedAt: string;
};

export type ReportingProgrammeItem = {
  id: string;
  sectionCode: string;
  sectionLabel: string;
  rowCode: string;
  rowLabel: string;
  levelCode: string;
  isEditable: boolean;
  startDate: string;
  endDate: string;
  reportingDate: string;
  referenceRagCode: string;
  referenceRagComment: string;
};

export type ProjectIndexWorkspace = {
  summary: ProjectSummary;
  teamMembers: ProjectTeamMemberDraft[];
  reportingProgramme: ReportingProgrammeItem[];
};

export type ProjectIndexOptions = {
  gateways: string[];
  reportingStages: string[];
  subStages: string[];
  projectStatuses: string[];
  reportingStatuses: string[];
  localAuthorities: string[];
  originOfLand: string[];
  staffRoles: string[];
  teams: string[];
};

function dateKey(value: Date | string | undefined | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function isActiveProject(project: Pick<ProjectRecord, "effective_to">): boolean {
  return dateKey(project.effective_to) === ACTIVE_EFFECTIVE_TO;
}

function getCurrentUser(): AuthenticatedUser {
  const session = getRayfinClient().auth.getSession();

  if (!session.isAuthenticated || !session.user) {
    throw new Error("You must be signed in to access Project Index.");
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

function sortProjects(projects: ProjectRecord[]): ProjectRecord[] {
  return [...projects].sort((left, right) => {
    const activeRank = Number(isActiveProject(right)) - Number(isActiveProject(left));
    if (activeRank !== 0) return activeRank;

    const byRef = left.project_ref.localeCompare(right.project_ref);
    if (byRef !== 0) return byRef;

    return new Date(right.effective_from).getTime() - new Date(left.effective_from).getTime();
  });
}

function parseProjectRef(projectRef: string) {
  const match = /^([A-Z]{1,2}\d{3})-(\d{2})(?:-(\d{2}))?$/.exec(projectRef);

  if (!match) {
    return {
      siteCode: projectRef,
      planningCode: projectRef,
      contractCode: null,
    };
  }

  return {
    siteCode: match[1],
    planningCode: `${match[1]}-${match[2]}`,
    contractCode: match[3] ? `${match[1]}-${match[2]}-${match[3]}` : null,
  };
}

function formatDateLabel(value: Date | string | undefined | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function mapSummary(
  project: ProjectRecord,
  site: SiteRecord | undefined,
  summary: SummaryRecord | null,
): ProjectSummary {
  const parsed = parseProjectRef(project.project_ref);

  return {
    projectGuid: project.guid,
    projectRef: project.project_ref,
    projectName: summary?.project_name ?? "",
    gateway: summary?.gateway_code ?? "",
    reportingStage: summary?.reporting_stage_code ?? "",
    subStage: summary?.sub_stage_code ?? "",
    projectStatus: summary?.project_status_code ?? "",
    reportingStatus: summary?.reporting_status_code ?? "",
    siteCode: site?.site_code ?? parsed.siteCode,
    planningCode: parsed.planningCode,
    contractCode: parsed.contractCode,
    phaseNumber: summary?.phase_number ?? "",
    localAuthority: summary?.local_authority_code ?? "",
    originOfLand: summary?.origin_of_land_code ?? "",
    projectDescription: summary?.project_description ?? "",
    mapLink: summary?.map_link ?? "",
    lastEditedBy: summary?.updated_by_user_email ?? project.created_by_user_email,
    lastUpdatedAt: formatDateLabel(summary?.updated_at ?? project.effective_from),
  };
}

function mapTeamRecord(record: TeamRecord): ProjectTeamMemberDraft {
  return {
    id: record.id,
    personName: record.person_name ?? "",
    staffIdentifier: record.staff_identifier ?? "",
    entryMode: record.entry_mode === "directory" ? "directory" : "free_text",
    isUnverified: record.is_unverified,
    staffRole: record.staff_role_code ?? "",
    team: record.team_code ?? "",
    isResponsibleManager: record.is_responsible_manager,
    lastReviewedAt: dateKey(record.last_reviewed_at),
  };
}

function mapReportingRecord(
  record: ReportingRecord,
  sectionLabel: string,
): ReportingProgrammeItem {
  return {
    id: record.id,
    sectionCode: record.section_code,
    sectionLabel,
    rowCode: record.row_code,
    rowLabel: record.row_label,
    levelCode: record.level_code,
    isEditable: record.is_editable,
    startDate: dateKey(record.start_date),
    endDate: dateKey(record.end_date),
    reportingDate: dateKey(record.reporting_date),
    referenceRagCode: record.reference_rag_code ?? "",
    referenceRagComment: record.reference_rag_comment ?? "",
  };
}

function getSectionLabel(sectionCode: string): string {
  return (
    reportingProgrammeSeed.find((section) => section.sectionCode === sectionCode)
      ?.sectionLabel ?? sectionCode
  );
}

async function findProjectByGuid(projectGuid: string) {
  return getRayfinClient()
    .data.master_project_register.select(PROJECT_FIELDS)
    .where({ guid: { eq: projectGuid } })
    .findFirst();
}

async function findSiteMap(siteGuids: string[]) {
  if (siteGuids.length === 0) {
    return new Map<string, SiteRecord>();
  }

  const rows = await getRayfinClient()
    .data.master_site_register.select(SITE_FIELDS)
    .where({ guid: { in: siteGuids } })
    .first(-1)
    .execute();

  return new Map(rows.map((row) => [row.guid, row]));
}

async function findSummaries(projectGuids: string[]) {
  if (projectGuids.length === 0) return [] as SummaryRecord[];

  return getRayfinClient()
    .data.project_index_summary.select(SUMMARY_FIELDS)
    .where({ project_guid: { in: projectGuids } })
    .first(-1)
    .execute();
}

async function findResponsibleManagers(projectGuids: string[]) {
  if (projectGuids.length === 0) return [] as TeamRecord[];

  return getRayfinClient()
    .data.project_team_member.select(TEAM_FIELDS)
    .where({ project_guid: { in: projectGuids }, is_responsible_manager: { eq: true } })
    .first(-1)
    .execute();
}

async function ensureSummary(project: ProjectRecord): Promise<SummaryRecord> {
  const existing = await getRayfinClient()
    .data.project_index_summary.select(SUMMARY_FIELDS)
    .where({ project_guid: { eq: project.guid } })
    .findFirst();

  if (existing) return existing;

  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();

  return getRayfinClient().data.project_index_summary.create({
    id,
    guid: id,
    project_guid: project.guid,
    project_ref: project.project_ref,
    created_at: now,
    created_by_user_id: user.id,
    created_by_user_email: user.email,
    updated_at: now,
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  });
}

async function ensureReportingProgramme(projectGuid: string) {
  const existing = await getRayfinClient()
    .data.project_reporting_programme_item.select(REPORTING_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();

  if (existing.length > 0) return existing;

  const user = getCurrentUser();
  const now = new Date();
  const created: ReportingRecord[] = [];
  let sortOrder = 1;

  for (const section of reportingProgrammeSeed) {
    for (const item of section.items) {
      const id = crypto.randomUUID();
      const record = await getRayfinClient().data.project_reporting_programme_item.create({
        id,
        guid: id,
        project_guid: projectGuid,
        section_code: section.sectionCode,
        row_code: item.rowCode,
        row_label: item.rowLabel,
        level_code: item.levelCode,
        sort_order: sortOrder,
        is_editable: item.isEditable,
        created_at: now,
        created_by_user_id: user.id,
        created_by_user_email: user.email,
        updated_at: now,
        updated_by_user_id: user.id,
        updated_by_user_email: user.email,
      });

      created.push(record);
      sortOrder += 1;
    }
  }

  return created;
}

function toProjectIndexOptions(): ProjectIndexOptions {
  return {
    gateways: gatewayOptions,
    reportingStages: reportingStageOptions,
    subStages: subStageOptions,
    projectStatuses: projectStatusOptions,
    reportingStatuses: reportingStatusOptions,
    localAuthorities: localAuthorityOptions,
    originOfLand: originOfLandOptions,
    staffRoles: staffRoleOptions,
    teams: teamOptions,
  };
}

export async function getProjectRegisterAccess(): Promise<boolean> {
  if (isLocalBackend()) {
    return true;
  }

  const user = getCurrentUser();
  const roles = await getRayfinClient()
    .data.app_user_role.select(USER_ROLE_FIELDS)
    .where({ user_email: { eq: user.email } })
    .first(-1)
    .execute();
  const today = new Date();

  return roles.some((role) => {
    if (!role.active_flag) return false;
    if (!role.role_code.startsWith("project_register")) return false;

    const from = new Date(role.effective_from);
    const to = role.effective_to ? new Date(role.effective_to) : null;

    return from <= today && (!to || to >= today);
  });
}

export async function listProjectIndexProjects(input: {
  searchText: string;
  includeHistory: boolean;
}): Promise<ProjectListItem[]> {
  const projects = sortProjects(
    await getRayfinClient().data.master_project_register.select(PROJECT_FIELDS).first(-1).execute(),
  );
  const activeByRoot = new Map<string, ProjectRecord>();

  for (const project of projects) {
    if (isActiveProject(project) && !activeByRoot.has(project.root_guid)) {
      activeByRoot.set(project.root_guid, project);
    }
  }

  const filtered = projects.filter((project) => {
    if (!input.includeHistory && !isActiveProject(project)) {
      return false;
    }

    if (!input.searchText.trim()) {
      return true;
    }

    const query = input.searchText.trim().toUpperCase();
    return project.project_ref.includes(query);
  });

  const sites = await findSiteMap(Array.from(new Set(filtered.map((project) => project.site_guid))));
  const summaries = await findSummaries(filtered.map((project) => project.guid));
  const summaryMap = new Map(summaries.map((summary) => [summary.project_guid, summary]));
  const managers = await findResponsibleManagers(filtered.map((project) => project.guid));
  const managerMap = new Map<string, string>();

  for (const row of managers) {
    if (!row.project_guid || managerMap.has(row.project_guid)) continue;
    managerMap.set(row.project_guid, row.person_name ?? row.staff_identifier ?? "—");
  }

  return filtered
    .filter((project) => {
      const siteCode = sites.get(project.site_guid)?.site_code ?? "";
      const query = input.searchText.trim().toUpperCase();
      return !query || siteCode.includes(query) || project.project_ref.includes(query);
    })
    .map((project) => {
      const summary = summaryMap.get(project.guid) ?? null;
      const currentProject = activeByRoot.get(project.root_guid) ?? project;

      return {
        projectGuid: project.guid,
        projectRef: project.project_ref,
        siteCode: sites.get(project.site_guid)?.site_code ?? parseProjectRef(project.project_ref).siteCode,
        gateway: summary?.gateway_code ?? "—",
        reportingStage: summary?.reporting_stage_code ?? "—",
        projectStatus: summary?.project_status_code ?? (isActiveProject(project) ? "Active" : "Historical"),
        reportingStatus: summary?.reporting_status_code ?? "—",
        responsibleManager: managerMap.get(project.guid) ?? "—",
        lastUpdated: formatDateLabel(summary?.updated_at ?? project.effective_from),
        isActive: isActiveProject(project),
        rootGuid: project.root_guid,
        currentProjectGuid: currentProject.guid,
        currentProjectRef: currentProject.project_ref,
      };
    });
}

export async function getProjectIndexWorkspace(projectGuid: string): Promise<ProjectIndexWorkspace> {
  const project = await findProjectByGuid(projectGuid);

  if (!project) {
    throw new Error("Project not found.");
  }

  const [siteMap, summary, teamRows, reportingRows] = await Promise.all([
    findSiteMap([project.site_guid]),
    ensureSummary(project),
    getRayfinClient()
      .data.project_team_member.select(TEAM_FIELDS)
      .where({ project_guid: { eq: project.guid } })
      .first(-1)
      .execute(),
    ensureReportingProgramme(project.guid),
  ]);

  return {
    summary: mapSummary(project, siteMap.get(project.site_guid), summary),
    teamMembers: [...teamRows]
      .sort((left, right) => (left.person_name ?? "").localeCompare(right.person_name ?? ""))
      .map(mapTeamRecord),
    reportingProgramme: [...reportingRows]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((row) => mapReportingRecord(row, getSectionLabel(row.section_code))),
  };
}

export async function updateProjectSummaryField(
  projectGuid: string,
  field: keyof Pick<
    ProjectSummary,
    | "projectName"
    | "gateway"
    | "reportingStage"
    | "subStage"
    | "projectStatus"
    | "reportingStatus"
    | "phaseNumber"
    | "localAuthority"
    | "originOfLand"
    | "projectDescription"
    | "mapLink"
  >,
  value: string | number | "",
): Promise<void> {
  const project = await findProjectByGuid(projectGuid);

  if (!project) {
    throw new Error("Project not found.");
  }

  const summary = await ensureSummary(project);
  const user = getCurrentUser();
  const now = new Date();
  const patch: Partial<SummaryRecord> = {
    updated_at: now,
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  };

  switch (field) {
    case "projectName":
      patch.project_name = String(value).trim();
      break;
    case "gateway":
      patch.gateway_code = String(value).trim();
      break;
    case "reportingStage":
      patch.reporting_stage_code = String(value).trim();
      break;
    case "subStage":
      patch.sub_stage_code = String(value).trim();
      break;
    case "projectStatus":
      patch.project_status_code = String(value).trim();
      break;
    case "reportingStatus":
      patch.reporting_status_code = String(value).trim();
      break;
    case "phaseNumber":
      patch.phase_number = value === "" ? undefined : Number(value);
      break;
    case "localAuthority":
      patch.local_authority_code = String(value).trim();
      break;
    case "originOfLand":
      patch.origin_of_land_code = String(value).trim();
      break;
    case "projectDescription":
      patch.project_description = String(value).trim();
      break;
    case "mapLink":
      patch.map_link = String(value).trim();
      break;
  }

  await getRayfinClient().data.project_index_summary.update({ id: summary.id }, patch);
}

export async function createProjectTeamMember(projectGuid: string): Promise<ProjectTeamMemberDraft> {
  const user = getCurrentUser();
  const now = new Date();
  const id = crypto.randomUUID();

  const row = await getRayfinClient().data.project_team_member.create({
    id,
    guid: id,
    project_guid: projectGuid,
    person_name: "",
    staff_identifier: "",
    entry_mode: "free_text",
    is_unverified: true,
    staff_role_code: "",
    team_code: "",
    is_responsible_manager: false,
    last_reviewed_at: now,
    created_at: now,
    created_by_user_id: user.id,
    created_by_user_email: user.email,
    updated_at: now,
    updated_by_user_id: user.id,
    updated_by_user_email: user.email,
  });

  return mapTeamRecord(row);
}

export async function updateProjectTeamMember(
  projectGuid: string,
  member: ProjectTeamMemberDraft,
): Promise<void> {
  const allRows = await getRayfinClient()
    .data.project_team_member.select(TEAM_FIELDS)
    .where({ project_guid: { eq: projectGuid } })
    .first(-1)
    .execute();
  const normalizedIdentity = (member.staffIdentifier || member.personName).trim().toUpperCase();

  if (
    normalizedIdentity &&
    allRows.some((row) => {
      if (row.id === member.id) return false;
      const rowIdentity = (row.staff_identifier || row.person_name || "").trim().toUpperCase();
      return rowIdentity === normalizedIdentity;
    })
  ) {
    throw new Error("Each person can appear only once per project.");
  }

  const user = getCurrentUser();
  const now = new Date();

  await getRayfinClient().data.project_team_member.update(
    { id: member.id },
    {
      person_name: member.personName.trim(),
      staff_identifier: member.staffIdentifier.trim(),
      entry_mode: member.entryMode,
      is_unverified: member.isUnverified,
      staff_role_code: member.staffRole.trim(),
      team_code: member.team.trim(),
      is_responsible_manager: member.isResponsibleManager,
      last_reviewed_at: now,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    },
  );
}

export async function deleteProjectTeamMember(memberId: string): Promise<void> {
  await getRayfinClient().data.project_team_member.delete({ id: memberId });
}

export async function updateReportingProgrammeItem(
  itemId: string,
  patch: Partial<Pick<ReportingProgrammeItem, "startDate" | "endDate" | "reportingDate">>,
): Promise<void> {
  const user = getCurrentUser();
  const now = new Date();

  await getRayfinClient().data.project_reporting_programme_item.update(
    { id: itemId },
    {
      start_date: patch.startDate ? new Date(patch.startDate) : undefined,
      end_date: patch.endDate ? new Date(patch.endDate) : undefined,
      reporting_date: patch.reportingDate ? new Date(patch.reportingDate) : undefined,
      updated_at: now,
      updated_by_user_id: user.id,
      updated_by_user_email: user.email,
    },
  );
}

export function getProjectIndexOptions(): ProjectIndexOptions {
  return toProjectIndexOptions();
}
