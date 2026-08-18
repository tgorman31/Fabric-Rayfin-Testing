import type { master_project_register } from "../../rayfin/data/master_project_register";

import { getRayfinClient } from "./rayfinClient";

const MAX_CREATE_ATTEMPTS = 5;
const MAX_PROJECT_NUMBER = 99;
const MAX_CONTRACT_SPLITS = 99;
const EFFECTIVE_TO = new Date("2099-12-31T00:00:00.000Z");
const SITE_PROJECT_REF_PATTERN = /^([A-Z]{1,2}\d{3})-(\d{2})$/;
const CONTRACT_PROJECT_REF_PATTERN = /^([A-Z]{1,2}\d{3}-\d{2})-(\d{2})$/;
const SITE_FIELDS = [
  "id",
  "guid",
  "site_code",
  "next_project_number",
  "created_at",
  "created_by_user_id",
  "created_by_user_email",
] as const;
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

type ProjectRecord = master_project_register;

export type CreateProjectResult = {
  projectRef: string;
  projectGuid: string;
  siteGuid: string;
};

export type PlanningSplitResult = {
  sourceProjectRef: string;
  createdProjectRefs: string[];
};

export type ContractSplitResult = {
  sourceProjectRef: string;
  createdProjectRefs: string[];
  existingProjectRefs: string[];
};

type AuthenticatedUser = {
  id: string;
  email: string;
};

async function findSiteByCode(siteCode: string) {
  return getRayfinClient()
    .data.master_site_register.select(SITE_FIELDS)
    .where({ site_code: { eq: siteCode } })
    .findFirst();
}

async function findSiteByGuid(siteGuid: string) {
  return getRayfinClient()
    .data.master_site_register.select(SITE_FIELDS)
    .where({ guid: { eq: siteGuid } })
    .findFirst();
}

function getCurrentUser(): AuthenticatedUser {
  const session = getRayfinClient().auth.getSession();

  if (!session.isAuthenticated || !session.user) {
    throw new Error("You must be signed in to create a project.");
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

async function getOrCreateSite(
  siteCode: string,
  user: AuthenticatedUser,
  now: Date,
) {
  const data = getRayfinClient().data;
  const existingSite = await findSiteByCode(siteCode);

  if (existingSite) {
    return existingSite;
  }

  const siteGuid = crypto.randomUUID();

  try {
    return await data.master_site_register.create({
      id: siteGuid,
      guid: siteGuid,
      site_code: siteCode,
      next_project_number: 1,
      created_at: now,
      created_by_user_id: user.id,
      created_by_user_email: user.email,
    });
  } catch (error) {
    const siteCreatedByAnotherRequest = await findSiteByCode(siteCode);

    if (siteCreatedByAnotherRequest) {
      return siteCreatedByAnotherRequest;
    }

    throw error;
  }
}

function formatProjectRef(siteCode: string, projectNumber: number): string {
  return `${siteCode}-${String(projectNumber).padStart(2, "0")}`;
}

function formatContractProjectRef(
  projectRef: string,
  splitNumber: number,
): string {
  return `${projectRef}-${String(splitNumber).padStart(2, "0")}`;
}

function getUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dateOnlyKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function isActiveProject(project: NonNullable<ProjectRecord>): boolean {
  return dateOnlyKey(project.effective_to) === dateOnlyKey(EFFECTIVE_TO);
}

function parseSiteProjectRef(projectRef: string) {
  const match = SITE_PROJECT_REF_PATTERN.exec(projectRef);

  if (!match) {
    return null;
  }

  return {
    siteCode: match[1],
    projectNumber: Number(match[2]),
  };
}

function parseContractProjectRef(projectRef: string) {
  const match = CONTRACT_PROJECT_REF_PATTERN.exec(projectRef);

  if (!match) {
    return null;
  }

  return {
    parentProjectRef: match[1],
    contractNumber: Number(match[2]),
  };
}

function assertValidProjectNumber(
  projectNumber: number,
  siteCode: string,
): void {
  if (!Number.isInteger(projectNumber) || projectNumber < 1) {
    throw new Error(`Site ${siteCode} has an invalid next project number.`);
  }

  if (projectNumber > MAX_PROJECT_NUMBER) {
    throw new Error(
      `Site ${siteCode} has reached the maximum project number of ${MAX_PROJECT_NUMBER}.`,
    );
  }
}

function isUniqueProjectRefError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /project_ref|unique|duplicate|conflict/i.test(message);
}

async function findActiveProjectByRef(projectRef: string) {
  const projects = await getRayfinClient()
    .data.master_project_register.select(PROJECT_FIELDS)
    .where({ project_ref: { eq: projectRef } })
    .first(-1)
    .execute();

  return projects.find(isActiveProject) ?? null;
}

async function findProjectsForSite(siteGuid: string) {
  return getRayfinClient()
    .data.master_project_register.select(["project_ref"] as const)
    .where({ site_guid: { eq: siteGuid } })
    .first(-1)
    .execute();
}

async function findContractRefsForProject(projectRef: string) {
  const projects = await getRayfinClient()
    .data.master_project_register.select(["project_ref"] as const)
    .where({ project_ref: { startsWith: `${projectRef}-` } })
    .first(-1)
    .execute();

  return Array.from(
    new Set(
      projects
        .map((project) => project.project_ref)
        .filter(
          (ref) =>
            parseContractProjectRef(ref)?.parentProjectRef === projectRef,
        ),
    ),
  ).sort();
}

async function getNextAvailableSiteProjectNumber(
  siteGuid: string,
  siteCode: string,
  nextProjectNumber: number,
): Promise<number> {
  const siteProjects = await findProjectsForSite(siteGuid);
  const highestExistingProjectNumber = siteProjects.reduce(
    (highest, project) => {
      const parsed = parseSiteProjectRef(project.project_ref);

      if (!parsed || parsed.siteCode !== siteCode) {
        return highest;
      }

      return Math.max(highest, parsed.projectNumber);
    },
    0,
  );
  const nextAvailableNumber = Math.max(
    Number(nextProjectNumber),
    highestExistingProjectNumber + 1,
  );

  assertValidProjectNumber(nextAvailableNumber, siteCode);
  return nextAvailableNumber;
}

async function createProjectRegisterRow(input: {
  projectRef: string;
  siteGuid: string;
  effectiveFrom: Date;
  user: AuthenticatedUser;
  parentGuid?: string;
  rootGuid?: string;
}) {
  const projectGuid = crypto.randomUUID();

  return getRayfinClient().data.master_project_register.create({
    id: projectGuid,
    guid: projectGuid,
    parent_guid: input.parentGuid,
    root_guid: input.rootGuid ?? projectGuid,
    project_ref: input.projectRef,
    site_guid: input.siteGuid,
    effective_from: input.effectiveFrom,
    effective_to: EFFECTIVE_TO,
    created_by_user_id: input.user.id,
    created_by_user_email: input.user.email,
  });
}

export async function createProject(
  siteCode: string,
): Promise<CreateProjectResult> {
  const client = getRayfinClient();
  const data = client.data;
  const user = getCurrentUser();
  const now = new Date();
  const effectiveFrom = getUtcDateOnly(now);
  const site = await getOrCreateSite(siteCode, user, now);

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const latestSite = await findSiteByGuid(site.guid);

    if (!latestSite) {
      throw new Error(`Site ${siteCode} was not found after creation.`);
    }

    const projectNumber = await getNextAvailableSiteProjectNumber(
      latestSite.guid,
      siteCode,
      latestSite.next_project_number,
    );
    const projectRef = formatProjectRef(siteCode, projectNumber);

    await data.master_site_register.update(
      { id: latestSite.id },
      { next_project_number: projectNumber + 1 },
    );

    try {
      const project = await createProjectRegisterRow({
        projectRef,
        siteGuid: latestSite.guid,
        effectiveFrom,
        user,
      });

      return {
        projectRef: project.project_ref,
        projectGuid: project.guid,
        siteGuid: latestSite.guid,
      };
    } catch (error) {
      if (
        !isUniqueProjectRefError(error) ||
        attempt === MAX_CREATE_ATTEMPTS - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to allocate the next project reference for ${siteCode}.`,
  );
}

export async function splitForNewPlanningApplication(
  projectRef: string,
): Promise<PlanningSplitResult> {
  const parsedRef = parseSiteProjectRef(projectRef);

  if (!parsedRef) {
    throw new Error(
      "Enter a site-level project reference, e.g. D012-01 or KK123-01.",
    );
  }

  const user = getCurrentUser();
  const data = getRayfinClient().data;
  const sourceProject = await findActiveProjectByRef(projectRef);

  if (!sourceProject) {
    throw new Error(`No active project found for ${projectRef}.`);
  }

  const site = await findSiteByGuid(sourceProject.site_guid);

  if (!site) {
    throw new Error(`Site for project ${projectRef} was not found.`);
  }

  const today = getUtcDateOnly(new Date());
  const yesterday = addUtcDays(today, -1);
  const nextProjectNumber = await getNextAvailableSiteProjectNumber(
    site.guid,
    parsedRef.siteCode,
    site.next_project_number,
  );
  const newPlanningProjectRef = formatProjectRef(
    parsedRef.siteCode,
    nextProjectNumber,
  );

  await data.master_project_register.update(
    { id: sourceProject.id },
    { effective_to: yesterday },
  );

  const replacementProject = await createProjectRegisterRow({
    projectRef,
    siteGuid: sourceProject.site_guid,
    effectiveFrom: today,
    user,
    parentGuid: sourceProject.guid,
    rootGuid: sourceProject.guid,
  });
  const newPlanningProject = await createProjectRegisterRow({
    projectRef: newPlanningProjectRef,
    siteGuid: sourceProject.site_guid,
    effectiveFrom: today,
    user,
    parentGuid: sourceProject.guid,
    rootGuid: sourceProject.guid,
  });

  await data.master_site_register.update(
    { id: site.id },
    { next_project_number: nextProjectNumber + 1 },
  );

  return {
    sourceProjectRef: projectRef,
    createdProjectRefs: [
      replacementProject.project_ref,
      newPlanningProject.project_ref,
    ],
  };
}

export async function splitForContracts(
  projectRef: string,
  totalContractSplits: number,
): Promise<ContractSplitResult> {
  if (!parseSiteProjectRef(projectRef)) {
    throw new Error(
      "Enter a site-level project reference, e.g. D012-01 or KK123-01. Contract refs cannot be split again.",
    );
  }

  if (
    !Number.isInteger(totalContractSplits) ||
    totalContractSplits < 2 ||
    totalContractSplits > MAX_CONTRACT_SPLITS
  ) {
    throw new Error("Enter a total contract split count between 2 and 99.");
  }

  const user = getCurrentUser();
  const data = getRayfinClient().data;
  const sourceProject = await findActiveProjectByRef(projectRef);

  if (!sourceProject) {
    throw new Error(`No active project found for ${projectRef}.`);
  }

  const existingContractRefs = await findContractRefsForProject(projectRef);
  const refsToCreate = Array.from({ length: totalContractSplits }, (_, index) =>
    formatContractProjectRef(projectRef, index + 1),
  ).filter((ref) => !existingContractRefs.includes(ref));
  const today = getUtcDateOnly(new Date());
  const yesterday = addUtcDays(today, -1);

  await data.master_project_register.update(
    { id: sourceProject.id },
    { effective_to: yesterday },
  );

  const createdProjects: ProjectRecord[] = [];

  for (const contractProjectRef of refsToCreate) {
    const project = await createProjectRegisterRow({
      projectRef: contractProjectRef,
      siteGuid: sourceProject.site_guid,
      effectiveFrom: today,
      user,
      parentGuid: sourceProject.guid,
      rootGuid: sourceProject.root_guid,
    });
    createdProjects.push(project);
  }

  return {
    sourceProjectRef: projectRef,
    createdProjectRefs: createdProjects.map((project) => project.project_ref),
    existingProjectRefs: existingContractRefs,
  };
}
