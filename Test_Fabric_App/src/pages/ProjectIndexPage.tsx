import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "@/hooks/AuthContext";
import {
  createProjectTeamMember,
  deleteProjectTeamMember,
  getProjectIndexOptions,
  getProjectIndexWorkspace,
  listProjectIndexProjects,
  type ProjectIndexWorkspace,
  type ProjectListItem,
  type ProjectSummary,
  type ProjectTeamMemberDraft,
  type ReportingProgrammeItem,
  type SaveState,
  updateProjectSummaryField,
  updateProjectTeamMember,
  updateReportingProgrammeItem,
} from "@/services/projectIndexService";

type MajorTab =
  | "project-information"
  | "reporting-programme"
  | "target-programme"
  | "tenure"
  | "board-report";
type InfoSection = "summary" | "team";

type ValidationState = Record<string, string | undefined>;

const majorTabs: Array<{ key: MajorTab; label: string; enabled: boolean }> = [
  { key: "project-information", label: "Project Information", enabled: true },
  { key: "reporting-programme", label: "Reporting Programme", enabled: true },
  { key: "target-programme", label: "Target Programme", enabled: false },
  { key: "tenure", label: "Tenure", enabled: false },
  { key: "board-report", label: "Board Report (v2)", enabled: false },
];

function statusText(saveState: SaveState) {
  switch (saveState) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return "Ready";
  }
}

function statusTone(saveState: SaveState) {
  switch (saveState) {
    case "saving":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "saved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "error":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-200";
  }
}

function monthAbbrev(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
  }).format(new Date(value));
}

function buildTimelineMonths(items: ReportingProgrammeItem[]) {
  const datedValues = items
    .flatMap((item) => [item.startDate, item.endDate, item.reportingDate])
    .filter(Boolean)
    .map((value) => new Date(`${value}T00:00:00`));

  const baseDate = datedValues.length > 0 ? datedValues[0] : new Date();
  const start = new Date(
    baseDate.getFullYear(),
    Math.max(baseDate.getMonth() - 1, 0),
    1,
  );

  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date),
      value: date,
    };
  });
}

function getTimelinePlacement(
  item: ReportingProgrammeItem,
  monthCount: number,
): { start: number; span: number } | null {
  const anchor = item.startDate || item.reportingDate || item.endDate;
  if (!anchor) return null;

  const startDate = new Date(
    `${(item.startDate || item.reportingDate || item.endDate) as string}T00:00:00`,
  );
  const endDate = new Date(
    `${(item.endDate || item.reportingDate || item.startDate) as string}T00:00:00`,
  );

  const start = Math.max(1, Math.min(monthCount, startDate.getMonth() + 1));
  const span = Math.max(
    1,
    Math.min(
      monthCount - start + 1,
      endDate.getMonth() - startDate.getMonth() + 1,
    ),
  );

  return { start, span };
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-8 py-12 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-gray-950">{title}</h3>
      <p className="mt-3 text-sm text-gray-500">
        This area is intentionally visible from day one, but the first build
        slice focuses on Project Information and Reporting Programme.
      </p>
    </div>
  );
}

export function ProjectIndexPage() {
  const { signOut, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [workspace, setWorkspace] = useState<ProjectIndexWorkspace | null>(
    null,
  );
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<MajorTab>("project-information");
  const [infoSection, setInfoSection] = useState<InfoSection>("summary");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>({});

  const selectedProjectGuid = searchParams.get("projectGuid");
  const options = useMemo(() => getProjectIndexOptions(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setError(null);
      try {
        const rows = await listProjectIndexProjects({
          searchText,
          includeHistory,
        });
        if (!cancelled) {
          setProjects(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load projects.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [searchText, includeHistory]);

  useEffect(() => {
    if (!selectedProjectGuid) {
      setWorkspace(null);
      return;
    }

    const projectGuid = selectedProjectGuid;
    let cancelled = false;

    async function loadWorkspace() {
      setLoadingWorkspace(true);
      setError(null);
      try {
        const nextWorkspace = await getProjectIndexWorkspace(projectGuid);
        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setValidation({});
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load project workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingWorkspace(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectGuid]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeoutId = window.setTimeout(() => setSaveState("idle"), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [saveState]);

  const selectedProject = useMemo(
    () =>
      projects.find((project) => project.projectGuid === selectedProjectGuid) ??
      null,
    [projects, selectedProjectGuid],
  );

  const timelineMonths = useMemo(
    () => buildTimelineMonths(workspace?.reportingProgramme ?? []),
    [workspace?.reportingProgramme],
  );

  function openProject(projectGuid: string) {
    setSearchParams({ projectGuid });
  }

  async function saveSummaryField(
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
  ) {
    if (!workspace) return;

    if (field === "projectName" && !String(value).trim()) {
      setValidation((current) => ({
        ...current,
        projectName: "Project Name is required.",
      }));
      setSaveState("error");
      return;
    }

    if (field === "phaseNumber" && value !== "") {
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0) {
        setValidation((current) => ({
          ...current,
          phaseNumber: "Phase must be a whole number of 0 or more.",
        }));
        setSaveState("error");
        return;
      }
    }

    setValidation((current) => ({ ...current, [field]: undefined }));
    setSaveState("saving");

    try {
      await updateProjectSummaryField(
        workspace.summary.projectGuid,
        field,
        value,
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              summary: {
                ...current.summary,
                [field]: value,
                lastEditedBy: user?.email ?? current.summary.lastEditedBy,
                lastUpdatedAt: new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date()),
              },
            }
          : current,
      );
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        err instanceof Error ? err.message : "Unable to save project summary.",
      );
    }
  }

  async function handleTeamSave(member: ProjectTeamMemberDraft) {
    if (!workspace) return;

    const identity = (member.staffIdentifier || member.personName).trim();
    if (!identity) {
      setValidation((current) => ({
        ...current,
        [`team-${member.id}`]: "Enter a person name or identifier.",
      }));
      setSaveState("error");
      return;
    }

    setValidation((current) => ({
      ...current,
      [`team-${member.id}`]: undefined,
    }));
    setSaveState("saving");

    try {
      await updateProjectTeamMember(workspace.summary.projectGuid, member);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              teamMembers: current.teamMembers.map((row) =>
                row.id === member.id
                  ? {
                      ...member,
                      lastReviewedAt: new Date().toISOString().slice(0, 10),
                    }
                  : row,
              ),
              summary: {
                ...current.summary,
                lastEditedBy: user?.email ?? current.summary.lastEditedBy,
                lastUpdatedAt: new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date()),
              },
            }
          : current,
      );
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        err instanceof Error ? err.message : "Unable to save team member.",
      );
    }
  }

  async function handleAddTeamMember() {
    if (!workspace) return;

    setSaveState("saving");
    try {
      const newMember = await createProjectTeamMember(
        workspace.summary.projectGuid,
      );
      setWorkspace((current) =>
        current
          ? { ...current, teamMembers: [...current.teamMembers, newMember] }
          : current,
      );
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        err instanceof Error ? err.message : "Unable to add team member.",
      );
    }
  }

  async function handleDeleteTeamMember(memberId: string) {
    setSaveState("saving");
    try {
      await deleteProjectTeamMember(memberId);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              teamMembers: current.teamMembers.filter(
                (row) => row.id !== memberId,
              ),
            }
          : current,
      );
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        err instanceof Error ? err.message : "Unable to delete team member.",
      );
    }
  }

  async function handleReportingSave(
    itemId: string,
    patch: Partial<
      Pick<ReportingProgrammeItem, "startDate" | "endDate" | "reportingDate">
    >,
  ) {
    if (!workspace) return;

    const nextStart =
      patch.startDate ??
      workspace.reportingProgramme.find((item) => item.id === itemId)
        ?.startDate ??
      "";
    const nextEnd =
      patch.endDate ??
      workspace.reportingProgramme.find((item) => item.id === itemId)
        ?.endDate ??
      "";

    if (nextStart && nextEnd && nextStart > nextEnd) {
      setValidation((current) => ({
        ...current,
        [`reporting-${itemId}`]: "End date must be on or after start date.",
      }));
      setSaveState("error");
      return;
    }

    setValidation((current) => ({
      ...current,
      [`reporting-${itemId}`]: undefined,
    }));
    setSaveState("saving");

    try {
      await updateReportingProgrammeItem(itemId, patch);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              reportingProgramme: current.reportingProgramme.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
              summary: {
                ...current.summary,
                lastEditedBy: user?.email ?? current.summary.lastEditedBy,
                lastUpdatedAt: new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date()),
              },
            }
          : current,
      );
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        err instanceof Error ? err.message : "Unable to save reporting item.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-gray-950">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/apps"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-700 transition hover:border-[#8fb73e] hover:text-[#025437]"
              aria-label="Open app launcher"
            >
              <span className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }, (_, index) => (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 rounded-full bg-current"
                  />
                ))}
              </span>
            </Link>
            <div>
              <p className="text-sm font-semibold text-[#006838]">
                Project Index
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Planner workspace
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusTone(saveState)}`}
            >
              {statusText(saveState)}
            </span>
            {workspace ? (
              <span className="hidden text-sm text-gray-500 xl:inline">
                Last updated by {workspace.summary.lastEditedBy} ·{" "}
                {workspace.summary.lastUpdatedAt}
              </span>
            ) : null}
            {user ? (
              <span className="hidden text-sm text-gray-500 md:inline">
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <aside className="space-y-5 rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(2,84,55,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a5a5a]">
                  Projects
                </p>
                <h2 className="mt-1 text-xl font-semibold">Project list</h2>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={(event) => setIncludeHistory(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#025437] focus:ring-[#8fb73e]"
                />
                Show History
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-[#f8faf8] p-4">
              <label
                htmlFor="project-search"
                className="block text-sm font-medium text-gray-700"
              >
                Search by project ref or site code
              </label>
              <input
                id="project-search"
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value.toUpperCase())
                }
                placeholder="D012-01 or D012"
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
              />
            </div>

            {loadingProjects ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                Loading projects...
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => {
                  const isSelected =
                    project.projectGuid === selectedProjectGuid;
                  const canOpenCurrent =
                    !project.isActive &&
                    project.currentProjectGuid !== project.projectGuid;

                  return (
                    <article
                      key={project.projectGuid}
                      className={`rounded-[1.5rem] border p-4 transition ${
                        isSelected
                          ? "border-[#025437] bg-[#f1f8f4] shadow-sm"
                          : "border-gray-200 bg-white hover:border-[#8fb73e]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-950">
                              {project.projectRef}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                project.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {project.isActive ? "Active" : "Historical"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            {project.siteCode} · {project.gateway} ·{" "}
                            {project.reportingStage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProject(project.projectGuid)}
                          className="rounded-full bg-[#025437] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#01462e]"
                        >
                          {project.isActive
                            ? "Open current"
                            : "Open historical"}
                        </button>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
                        <div>
                          <dt className="font-medium text-gray-500">
                            Project Status
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {project.projectStatus}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Reporting Status
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {project.reportingStatus}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Responsible Manager
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {project.responsibleManager}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Last Updated
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {project.lastUpdated}
                          </dd>
                        </div>
                      </dl>

                      {canOpenCurrent ? (
                        <button
                          type="button"
                          onClick={() =>
                            openProject(project.currentProjectGuid)
                          }
                          className="mt-4 rounded-full border border-[#8fb73e] px-3.5 py-2 text-xs font-semibold text-[#025437] transition hover:bg-[#f1f8f4]"
                        >
                          Open current ({project.currentProjectRef})
                        </button>
                      ) : null}
                    </article>
                  );
                })}
                {projects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                    No projects match the current search.
                  </div>
                ) : null}
              </div>
            )}
          </aside>

          <section className="space-y-5">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!selectedProjectGuid ? (
              <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-8 py-16 text-center shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-950">
                  Open a project
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">
                  Select a project from the list to start editing Project
                  Information and Reporting Programme data.
                </p>
              </div>
            ) : loadingWorkspace || !workspace ? (
              <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-8 py-16 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  Loading project workspace...
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(2,84,55,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#006838]">
                        {workspace.summary.projectRef}
                      </p>
                      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
                        {workspace.summary.projectName ||
                          selectedProject?.projectRef}
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        Site {workspace.summary.siteCode} · Planning{" "}
                        {workspace.summary.planningCode} · Contract{" "}
                        {workspace.summary.contractCode ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-[#f7faf8] px-4 py-3 text-sm text-gray-600">
                      Last updated by {workspace.summary.lastEditedBy}
                      <br />
                      <span className="font-medium text-gray-900">
                        {workspace.summary.lastUpdatedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {majorTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        disabled={!tab.enabled}
                        onClick={() => tab.enabled && setActiveTab(tab.key)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          activeTab === tab.key
                            ? "bg-[#025437] text-white"
                            : tab.enabled
                              ? "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                              : "cursor-not-allowed text-gray-400"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === "project-information" ? (
                  <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className="rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setInfoSection("summary")}
                        className={`mb-2 block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                          infoSection === "summary"
                            ? "bg-[#f1f8f4] text-[#025437]"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                        }`}
                      >
                        Summary & Base Info
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoSection("team")}
                        className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                          infoSection === "team"
                            ? "bg-[#f1f8f4] text-[#025437]"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                        }`}
                      >
                        Project Team
                      </button>
                    </aside>

                    {infoSection === "summary" ? (
                      <div className="space-y-5">
                        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-950">
                            Project summary
                          </h3>
                          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Project Ref
                              </label>
                              <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                                {workspace.summary.projectRef}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Project Name
                              </label>
                              <input
                                value={workspace.summary.projectName}
                                onChange={(event) =>
                                  setWorkspace((current) =>
                                    current
                                      ? {
                                          ...current,
                                          summary: {
                                            ...current.summary,
                                            projectName: event.target.value,
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  void saveSummaryField(
                                    "projectName",
                                    event.target.value,
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                              />
                              {validation.projectName ? (
                                <p className="mt-2 text-xs text-red-600">
                                  {validation.projectName}
                                </p>
                              ) : null}
                            </div>
                            <SelectField
                              label="Gateway"
                              value={workspace.summary.gateway}
                              options={options.gateways}
                              onChange={(value) =>
                                void saveSummaryField("gateway", value)
                              }
                            />
                            <SelectField
                              label="Reporting Stage"
                              value={workspace.summary.reportingStage}
                              options={options.reportingStages}
                              onChange={(value) =>
                                void saveSummaryField("reportingStage", value)
                              }
                            />
                            <SelectField
                              label="Sub-Stage"
                              value={workspace.summary.subStage}
                              options={options.subStages}
                              onChange={(value) =>
                                void saveSummaryField("subStage", value)
                              }
                            />
                            <SelectField
                              label="Project Status"
                              value={workspace.summary.projectStatus}
                              options={options.projectStatuses}
                              onChange={(value) =>
                                void saveSummaryField("projectStatus", value)
                              }
                            />
                            <SelectField
                              label="Reporting Status"
                              value={workspace.summary.reportingStatus}
                              options={options.reportingStatuses}
                              onChange={(value) =>
                                void saveSummaryField("reportingStatus", value)
                              }
                            />
                          </div>
                        </section>

                        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-950">
                            Base info
                          </h3>
                          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <ReadonlyField
                              label="Site Code"
                              value={workspace.summary.siteCode}
                            />
                            <ReadonlyField
                              label="Planning Code"
                              value={workspace.summary.planningCode}
                            />
                            <ReadonlyField
                              label="Contract Code"
                              value={workspace.summary.contractCode ?? "—"}
                            />
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Phase
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={workspace.summary.phaseNumber}
                                onChange={(event) =>
                                  setWorkspace((current) =>
                                    current
                                      ? {
                                          ...current,
                                          summary: {
                                            ...current.summary,
                                            phaseNumber:
                                              event.target.value === ""
                                                ? ""
                                                : Number(event.target.value),
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  void saveSummaryField(
                                    "phaseNumber",
                                    event.target.value === ""
                                      ? ""
                                      : Number(event.target.value),
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                              />
                              {validation.phaseNumber ? (
                                <p className="mt-2 text-xs text-red-600">
                                  {validation.phaseNumber}
                                </p>
                              ) : null}
                            </div>
                            <SelectField
                              label="Local Authority"
                              value={workspace.summary.localAuthority}
                              options={options.localAuthorities}
                              onChange={(value) =>
                                void saveSummaryField("localAuthority", value)
                              }
                            />
                            <SelectField
                              label="Origin of Land"
                              value={workspace.summary.originOfLand}
                              options={options.originOfLand}
                              onChange={(value) =>
                                void saveSummaryField("originOfLand", value)
                              }
                            />
                          </div>
                          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Project Description
                              </label>
                              <textarea
                                rows={5}
                                value={workspace.summary.projectDescription}
                                onChange={(event) =>
                                  setWorkspace((current) =>
                                    current
                                      ? {
                                          ...current,
                                          summary: {
                                            ...current.summary,
                                            projectDescription:
                                              event.target.value,
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  void saveSummaryField(
                                    "projectDescription",
                                    event.target.value,
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                              />
                            </div>
                            <div className="rounded-[1.5rem] border border-gray-200 bg-[#f8faf8] p-4">
                              <label className="text-sm font-medium text-gray-700">
                                Map preview / link
                              </label>
                              <input
                                value={workspace.summary.mapLink}
                                onChange={(event) =>
                                  setWorkspace((current) =>
                                    current
                                      ? {
                                          ...current,
                                          summary: {
                                            ...current.summary,
                                            mapLink: event.target.value,
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  void saveSummaryField(
                                    "mapLink",
                                    event.target.value,
                                  )
                                }
                                placeholder="https://maps.google.com/..."
                                className="mt-2 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                              />
                              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                                {workspace.summary.mapLink ? (
                                  <a
                                    href={workspace.summary.mapLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-[#006838] underline-offset-4 hover:underline"
                                  >
                                    Open map link
                                  </a>
                                ) : (
                                  "Add a Google Maps or coordinate link to surface a preview/action here."
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    ) : (
                      <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-950">
                              Project team
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Directory-backed search will follow. The current
                              slice supports free-text entries and marks them as
                              unverified.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleAddTeamMember()}
                            className="rounded-full bg-[#025437] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#01462e]"
                          >
                            Add team member
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="pb-3 pr-3 font-medium">ID</th>
                                <th className="pb-3 pr-3 font-medium">
                                  Person
                                </th>
                                <th className="pb-3 pr-3 font-medium">
                                  Identifier
                                </th>
                                <th className="pb-3 pr-3 font-medium">
                                  Staff Role
                                </th>
                                <th className="pb-3 pr-3 font-medium">Team</th>
                                <th className="pb-3 pr-3 font-medium">
                                  Responsible
                                </th>
                                <th className="pb-3 pr-3 font-medium">
                                  Last Reviewed
                                </th>
                                <th className="pb-3 pr-3 font-medium">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {workspace.teamMembers.map((member, index) => (
                                <tr key={member.id} className="align-top">
                                  <td className="py-3 pr-3 text-gray-500">
                                    {index + 1}
                                  </td>
                                  <td className="py-3 pr-3">
                                    <input
                                      value={member.personName}
                                      onChange={(event) =>
                                        setWorkspace((current) =>
                                          current
                                            ? {
                                                ...current,
                                                teamMembers:
                                                  current.teamMembers.map(
                                                    (row) =>
                                                      row.id === member.id
                                                        ? {
                                                            ...row,
                                                            personName:
                                                              event.target
                                                                .value,
                                                          }
                                                        : row,
                                                  ),
                                              }
                                            : current,
                                        )
                                      }
                                      onBlur={() => void handleTeamSave(member)}
                                      className="block min-w-[180px] rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                      placeholder="Search directory or type name"
                                    />
                                    {member.isUnverified ? (
                                      <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                        Unverified
                                      </span>
                                    ) : null}
                                    {validation[`team-${member.id}`] ? (
                                      <p className="mt-2 text-xs text-red-600">
                                        {validation[`team-${member.id}`]}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="py-3 pr-3">
                                    <input
                                      value={member.staffIdentifier}
                                      onChange={(event) =>
                                        setWorkspace((current) =>
                                          current
                                            ? {
                                                ...current,
                                                teamMembers:
                                                  current.teamMembers.map(
                                                    (row) =>
                                                      row.id === member.id
                                                        ? {
                                                            ...row,
                                                            staffIdentifier:
                                                              event.target
                                                                .value,
                                                            isUnverified: true,
                                                          }
                                                        : row,
                                                  ),
                                              }
                                            : current,
                                        )
                                      }
                                      onBlur={() => void handleTeamSave(member)}
                                      className="block min-w-[180px] rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                      placeholder="email / username"
                                    />
                                  </td>
                                  <td className="py-3 pr-3">
                                    <InlineSelect
                                      value={member.staffRole}
                                      options={options.staffRoles}
                                      onChange={(value) => {
                                        setWorkspace((current) =>
                                          current
                                            ? {
                                                ...current,
                                                teamMembers:
                                                  current.teamMembers.map(
                                                    (row) =>
                                                      row.id === member.id
                                                        ? {
                                                            ...row,
                                                            staffRole: value,
                                                          }
                                                        : row,
                                                  ),
                                              }
                                            : current,
                                        );
                                        void handleTeamSave({
                                          ...member,
                                          staffRole: value,
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="py-3 pr-3">
                                    <InlineSelect
                                      value={member.team}
                                      options={options.teams}
                                      onChange={(value) => {
                                        setWorkspace((current) =>
                                          current
                                            ? {
                                                ...current,
                                                teamMembers:
                                                  current.teamMembers.map(
                                                    (row) =>
                                                      row.id === member.id
                                                        ? {
                                                            ...row,
                                                            team: value,
                                                          }
                                                        : row,
                                                  ),
                                              }
                                            : current,
                                        );
                                        void handleTeamSave({
                                          ...member,
                                          team: value,
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="py-3 pr-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={member.isResponsibleManager}
                                        onChange={(event) => {
                                          const nextValue =
                                            event.target.checked;
                                          setWorkspace((current) =>
                                            current
                                              ? {
                                                  ...current,
                                                  teamMembers:
                                                    current.teamMembers.map(
                                                      (row) =>
                                                        row.id === member.id
                                                          ? {
                                                              ...row,
                                                              isResponsibleManager:
                                                                nextValue,
                                                            }
                                                          : row,
                                                    ),
                                                }
                                              : current,
                                          );
                                          void handleTeamSave({
                                            ...member,
                                            isResponsibleManager: nextValue,
                                          });
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-[#025437] focus:ring-[#8fb73e]"
                                      />
                                      Yes
                                    </label>
                                  </td>
                                  <td className="py-3 pr-3 text-gray-700">
                                    {member.lastReviewedAt || "—"}
                                  </td>
                                  <td className="py-3 pr-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteTeamMember(member.id)
                                      }
                                      className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {workspace.teamMembers.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={8}
                                    className="py-8 text-center text-sm text-gray-500"
                                  >
                                    No project team members added yet.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                  </div>
                ) : activeTab === "reporting-programme" ? (
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_420px]">
                    <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                      <div className="mb-5">
                        <h3 className="text-lg font-semibold text-gray-950">
                          Reporting Programme
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Full section structure is present in the first slice.
                          Dates are editable in the grid and the planner view
                          renders alongside.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="pb-3 pr-3 font-medium">Section</th>
                              <th className="pb-3 pr-3 font-medium">Item</th>
                              <th className="pb-3 pr-3 font-medium">Lvl</th>
                              <th className="pb-3 pr-3 font-medium">Start</th>
                              <th className="pb-3 pr-3 font-medium">End</th>
                              <th className="pb-3 pr-3 font-medium">
                                Reporting
                              </th>
                              <th className="pb-3 pr-3 font-medium">Mth</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {workspace.reportingProgramme.map((item) => (
                              <tr key={item.id} className="align-top">
                                <td className="py-3 pr-3">
                                  <span className="rounded-full bg-[#f1f8f4] px-2.5 py-1 text-[11px] font-semibold text-[#025437]">
                                    {item.sectionLabel}
                                  </span>
                                </td>
                                <td className="py-3 pr-3 font-medium text-gray-900">
                                  {item.rowLabel}
                                </td>
                                <td className="py-3 pr-3 text-gray-700">
                                  {item.levelCode}
                                </td>
                                <td className="py-3 pr-3">
                                  <input
                                    type="date"
                                    disabled={!item.isEditable}
                                    value={item.startDate}
                                    onChange={(event) =>
                                      setWorkspace((current) =>
                                        current
                                          ? {
                                              ...current,
                                              reportingProgramme:
                                                current.reportingProgramme.map(
                                                  (row) =>
                                                    row.id === item.id
                                                      ? {
                                                          ...row,
                                                          startDate:
                                                            event.target.value,
                                                        }
                                                      : row,
                                                ),
                                            }
                                          : current,
                                      )
                                    }
                                    onBlur={(event) =>
                                      void handleReportingSave(item.id, {
                                        startDate: event.target.value,
                                      })
                                    }
                                    className={`rounded-xl border px-3 py-2 outline-none transition ${
                                      item.isEditable
                                        ? "border-gray-300 bg-white focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                        : "border-gray-200 bg-gray-50 text-gray-400"
                                    }`}
                                  />
                                </td>
                                <td className="py-3 pr-3">
                                  <input
                                    type="date"
                                    disabled={!item.isEditable}
                                    value={item.endDate}
                                    onChange={(event) =>
                                      setWorkspace((current) =>
                                        current
                                          ? {
                                              ...current,
                                              reportingProgramme:
                                                current.reportingProgramme.map(
                                                  (row) =>
                                                    row.id === item.id
                                                      ? {
                                                          ...row,
                                                          endDate:
                                                            event.target.value,
                                                        }
                                                      : row,
                                                ),
                                            }
                                          : current,
                                      )
                                    }
                                    onBlur={(event) =>
                                      void handleReportingSave(item.id, {
                                        endDate: event.target.value,
                                      })
                                    }
                                    className={`rounded-xl border px-3 py-2 outline-none transition ${
                                      item.isEditable
                                        ? "border-gray-300 bg-white focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                        : "border-gray-200 bg-gray-50 text-gray-400"
                                    }`}
                                  />
                                </td>
                                <td className="py-3 pr-3">
                                  <input
                                    type="date"
                                    value={item.reportingDate}
                                    onChange={(event) =>
                                      setWorkspace((current) =>
                                        current
                                          ? {
                                              ...current,
                                              reportingProgramme:
                                                current.reportingProgramme.map(
                                                  (row) =>
                                                    row.id === item.id
                                                      ? {
                                                          ...row,
                                                          reportingDate:
                                                            event.target.value,
                                                        }
                                                      : row,
                                                ),
                                            }
                                          : current,
                                      )
                                    }
                                    onBlur={(event) =>
                                      void handleReportingSave(item.id, {
                                        reportingDate: event.target.value,
                                      })
                                    }
                                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                  />
                                  {validation[`reporting-${item.id}`] ? (
                                    <p className="mt-2 text-xs text-red-600">
                                      {validation[`reporting-${item.id}`]}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="py-3 pr-3 text-gray-700">
                                  {monthAbbrev(
                                    item.reportingDate ||
                                      item.endDate ||
                                      item.startDate,
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <aside className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                      <div className="mb-5">
                        <h3 className="text-lg font-semibold text-gray-950">
                          Planner timeline
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Modern planner-style view for the first slice,
                          positioned beside the editable grid.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[360px]">
                          <div className="grid grid-cols-[150px_repeat(8,minmax(0,1fr))] gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <div>Item</div>
                            {timelineMonths.map((month) => (
                              <div key={month.key} className="text-center">
                                {month.label}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 space-y-3">
                            {workspace.reportingProgramme.map((item) => {
                              const placement = getTimelinePlacement(
                                item,
                                timelineMonths.length,
                              );

                              return (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-[150px_repeat(8,minmax(0,1fr))] items-center gap-2"
                                >
                                  <div
                                    className="truncate text-sm font-medium text-gray-700"
                                    title={item.rowLabel}
                                  >
                                    {item.rowLabel}
                                  </div>
                                  <div className="col-span-8 grid grid-cols-8 gap-2 rounded-full bg-[#f7faf8] p-2">
                                    {placement ? (
                                      <div
                                        className="h-6 rounded-full bg-gradient-to-r from-[#8fb73e] to-[#025437]"
                                        style={{
                                          gridColumn: `${placement.start} / span ${placement.span}`,
                                        }}
                                        title={`${item.rowLabel}: ${item.startDate || item.reportingDate || item.endDate || "No date"}`}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : activeTab === "target-programme" ? (
                  <PlaceholderPanel title="Target Programme" />
                ) : activeTab === "tenure" ? (
                  <PlaceholderPanel title="Tenure" />
                ) : (
                  <PlaceholderPanel title="Board Report v2" />
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
        {value}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-[160px] rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
    >
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
