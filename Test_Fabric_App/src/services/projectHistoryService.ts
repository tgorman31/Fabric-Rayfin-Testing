import type { master_project_register } from "../../rayfin/data/master_project_register";

import { getRayfinClient } from "./rayfinClient";

const EFFECTIVE_TO = new Date("2099-12-31T00:00:00.000Z");
const SITE_CODE_PATTERN = /^[A-Z]{1,2}\d{3}$/;
const PROJECT_REF_PATTERN = /^[A-Z]{1,2}\d{3}-\d{2}(?:-\d{2})?$/;
const PROJECT_FIELDS = [
  "id",
  "guid",
  "parent_guid",
  "root_guid",
  "project_ref",
  "site_guid",
  "effective_from",
  "effective_to",
  "created_by_user_id",
  "created_by_user_email",
] as const;
const SITE_FIELDS = ["guid", "site_code"] as const;

export type HistoryQueryMode = "site" | "project";
export type HistorySortMode = "chronological" | "tree";
export type InferredSplitReason = "planning" | "contract" | null;

export type ProjectHistoryNode = {
  id: string;
  guid: string;
  parentGuid: string | null;
  rootGuid: string;
  projectRef: string;
  siteGuid: string;
  effectiveFrom: Date;
  effectiveTo: Date;
  isActive: boolean;
  inferredSplitReason: InferredSplitReason;
};

export type ProjectHistoryResult = {
  query: string;
  mode: HistoryQueryMode;
  nodes: ProjectHistoryNode[];
  matchedGuids: string[];
  defaultSelectedGuid: string | null;
};

function isActiveProject(project: master_project_register): boolean {
  return toDateKey(project.effective_to) === toDateKey(EFFECTIVE_TO);
}

function toDateKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function parseContractProjectRef(projectRef: string) {
  const match = /^([A-Z]{1,2}\d{3}-\d{2})-(\d{2})$/.exec(projectRef);

  if (!match) {
    return null;
  }

  return {
    parentProjectRef: match[1],
    contractNumber: Number(match[2]),
  };
}

function inferSplitReason(
  project: master_project_register,
  children: master_project_register[],
): InferredSplitReason {
  if (children.length === 0) {
    return null;
  }

  const hasContractChildren = children.some(
    (child) =>
      parseContractProjectRef(child.project_ref)?.parentProjectRef ===
      project.project_ref,
  );

  return hasContractChildren ? "contract" : "planning";
}

function mapProjectsToHistoryNodes(
  projects: master_project_register[],
): ProjectHistoryNode[] {
  const childMap = new Map<string, master_project_register[]>();

  for (const project of projects) {
    if (!project.parent_guid) {
      continue;
    }

    const siblings = childMap.get(project.parent_guid) ?? [];
    siblings.push(project);
    childMap.set(project.parent_guid, siblings);
  }

  return projects.map((project) => ({
    id: project.id,
    guid: project.guid,
    parentGuid: project.parent_guid ?? null,
    rootGuid: project.root_guid,
    projectRef: project.project_ref,
    siteGuid: project.site_guid,
    effectiveFrom: new Date(project.effective_from),
    effectiveTo: new Date(project.effective_to),
    isActive: isActiveProject(project),
    inferredSplitReason: inferSplitReason(
      project,
      childMap.get(project.guid) ?? [],
    ),
  }));
}

function getDefaultSelectedGuid(matches: master_project_register[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  const activeMatch = matches.find(isActiveProject);

  if (activeMatch) {
    return activeMatch.guid;
  }

  return [...matches]
    .sort((left, right) => {
      const byFrom =
        new Date(right.effective_from).getTime() -
        new Date(left.effective_from).getTime();

      if (byFrom !== 0) {
        return byFrom;
      }

      return left.project_ref.localeCompare(right.project_ref);
    })[0]?.guid ?? null;
}

async function findSiteByCode(siteCode: string) {
  return getRayfinClient()
    .data.master_site_register.select(SITE_FIELDS)
    .where({ site_code: { eq: siteCode } })
    .findFirst();
}

async function findProjectsBySiteGuid(siteGuid: string) {
  return getRayfinClient()
    .data.master_project_register.select(PROJECT_FIELDS)
    .where({ site_guid: { eq: siteGuid } })
    .first(-1)
    .execute();
}

async function findProjectsByRef(projectRef: string) {
  return getRayfinClient()
    .data.master_project_register.select(PROJECT_FIELDS)
    .where({ project_ref: { eq: projectRef } })
    .first(-1)
    .execute();
}

async function findProjectsByRootGuids(rootGuids: string[]) {
  return getRayfinClient()
    .data.master_project_register.select(PROJECT_FIELDS)
    .where({ root_guid: { in: rootGuids } })
    .first(-1)
    .execute();
}

export async function getProjectHistory(
  rawQuery: string,
): Promise<ProjectHistoryResult> {
  const query = rawQuery.trim().toUpperCase();

  if (SITE_CODE_PATTERN.test(query)) {
    const site = await findSiteByCode(query);

    if (!site) {
      throw new Error(`No site found for ${query}.`);
    }

    const projects = await findProjectsBySiteGuid(site.guid);

    if (projects.length === 0) {
      throw new Error(`No project history found for site ${query}.`);
    }

    return {
      query,
      mode: "site",
      nodes: mapProjectsToHistoryNodes(projects),
      matchedGuids: [],
      defaultSelectedGuid: null,
    };
  }

  if (!PROJECT_REF_PATTERN.test(query)) {
    throw new Error(
      "Enter a site code like D012 or a project reference like D012-01 or D012-01-01.",
    );
  }

  const matchedProjects = await findProjectsByRef(query);

  if (matchedProjects.length === 0) {
    throw new Error(`No project history found for ${query}.`);
  }

  const rootGuids = Array.from(
    new Set(matchedProjects.map((project) => project.root_guid)),
  );
  const lineageProjects = await findProjectsByRootGuids(rootGuids);

  return {
    query,
    mode: "project",
    nodes: mapProjectsToHistoryNodes(lineageProjects),
    matchedGuids: matchedProjects.map((project) => project.guid),
    defaultSelectedGuid: getDefaultSelectedGuid(matchedProjects),
  };
}
