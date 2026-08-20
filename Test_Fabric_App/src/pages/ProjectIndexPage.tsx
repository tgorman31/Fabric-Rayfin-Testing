import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

type TimelineMonth = {
  key: string;
  label: string;
  start: Date;
};

type ReportingSectionGroup = {
  sectionCode: string;
  sectionLabel: string;
  items: ReportingProgrammeItem[];
};

type SectionTheme = {
  headerClass: string;
  barClass: string;
  railClass: string;
  textClass: string;
};

const majorTabs: Array<{ key: MajorTab; label: string; enabled: boolean }> = [
  { key: "project-information", label: "Project Information", enabled: true },
  { key: "reporting-programme", label: "Reporting Programme", enabled: true },
  { key: "target-programme", label: "Target Programme", enabled: false },
  { key: "tenure", label: "Tenure", enabled: false },
  { key: "board-report", label: "Board Report", enabled: false },
];

const sectionThemes: Record<string, SectionTheme> = {
  "land-activation": {
    headerClass: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",

    barClass: "from-fuchsia-500 to-fuchsia-700",
    railClass: "bg-fuchsia-100/70",
    textClass: "text-fuchsia-700",
  },
  "site-pipeline": {
    headerClass: "bg-emerald-50 text-emerald-800 border-emerald-200",

    barClass: "from-emerald-400 to-emerald-600",
    railClass: "bg-emerald-100/70",
    textClass: "text-emerald-700",
  },
  planning: {
    headerClass: "bg-amber-50 text-amber-800 border-amber-200",

    barClass: "from-amber-300 to-orange-500",
    railClass: "bg-amber-100/70",
    textClass: "text-amber-700",
  },
  ddtc: {
    headerClass: "bg-cyan-50 text-cyan-800 border-cyan-200",

    barClass: "from-cyan-300 to-cyan-500",
    railClass: "bg-cyan-100/70",
    textClass: "text-cyan-700",
  },
  construction: {
    headerClass: "bg-pink-50 text-pink-800 border-pink-200",

    barClass: "from-pink-300 to-pink-500",
    railClass: "bg-pink-100/70",
    textClass: "text-pink-700",
  },
};

const REPORTING_LEFT_GRID = "260px 72px 156px 156px 96px";
const REPORTING_LEFT_WIDTH = 740;
const TIMELINE_MIN_WIDTH = 980;

function getSectionTheme(sectionCode: string): SectionTheme {
  return (
    sectionThemes[sectionCode] ?? {
      headerClass: "bg-slate-100 text-slate-800 border-slate-200",

      barClass: "from-slate-400 to-slate-600",
      railClass: "bg-slate-100",
      textClass: "text-slate-700",
    }
  );
}

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
      return "text-amber-700";
    case "saved":
      return "text-emerald-700";
    case "error":
      return "text-red-700";
    default:
      return "text-slate-500";
  }
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function dateFromInput(value: string): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
}

function getDurationLabel(item: ReportingProgrammeItem): string {
  const start = dateFromInput(item.startDate);
  const end = dateFromInput(item.endDate);

  if (!start && !end) return "—";
  if (start && !end) return "1 mo";
  if (!start && end) return "1 mo";

  const months = Math.max(
    1,
    monthDiff(startOfMonth(start as Date), startOfMonth(end as Date)) + 1,
  );
  return `${months} mo`;
}

function buildTimelineMonths(items: ReportingProgrammeItem[]): TimelineMonth[] {
  const dates = items
    .flatMap((item) => [item.startDate, item.endDate])
    .filter(Boolean)
    .map((value) => startOfMonth(new Date(`${value as string}T00:00:00`)));

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const base = sorted[0] ?? startOfMonth(new Date());
  const last = sorted[sorted.length - 1] ?? addMonths(base, 7);
  const start = addMonths(base, -1);
  const span = Math.max(8, monthDiff(start, addMonths(last, 1)) + 1);

  return Array.from({ length: span }, (_, index) => {
    const date = addMonths(start, index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatMonthLabel(date),
      start: date,
    };
  });
}

function getTimelinePlacement(
  item: ReportingProgrammeItem,
  timelineMonths: TimelineMonth[],
): { start: number; span: number } | null {
  if (timelineMonths.length === 0) return null;

  const startSource =
    dateFromInput(item.startDate) ?? dateFromInput(item.endDate);
  const endSource =
    dateFromInput(item.endDate) ?? dateFromInput(item.startDate);

  if (!startSource || !endSource) return null;

  const timelineStart = timelineMonths[0].start;
  const itemStart = startOfMonth(startSource);
  const itemEnd = startOfMonth(endSource);
  const unclampedStart = monthDiff(timelineStart, itemStart) + 1;
  const unclampedEnd = monthDiff(timelineStart, itemEnd) + 1;
  const start = Math.max(1, Math.min(timelineMonths.length, unclampedStart));
  const end = Math.max(start, Math.min(timelineMonths.length, unclampedEnd));

  return { start, span: end - start + 1 };
}

function groupReportingSections(
  items: ReportingProgrammeItem[],
): ReportingSectionGroup[] {
  const groups = new Map<string, ReportingSectionGroup>();

  for (const item of items) {
    const existing = groups.get(item.sectionCode);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(item.sectionCode, {
      sectionCode: item.sectionCode,
      sectionLabel: item.sectionLabel,
      items: [item],
    });
  }

  return Array.from(groups.values());
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white px-10 py-16 text-center shadow-sm">
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
        This area is intentionally present in the first application slice, but
        the current build focuses on Project Information and Reporting
        Programme.
      </p>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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
      className="min-w-40 rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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

function TimelineHeader({ months }: { months: TimelineMonth[] }) {
  return (
    <div
      className="grid h-full"
      style={{
        gridTemplateColumns: `repeat(${months.length}, minmax(72px, 1fr))`,
      }}
    >
      {months.map((month, index) => (
        <div
          key={month.key}
          className={`flex items-center justify-center border-l border-slate-200 px-2 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap text-slate-500 ${
            index % 2 === 0 ? "bg-slate-50" : "bg-white"
          }`}
        >
          {month.label}
        </div>
      ))}
    </div>
  );
}

function TimelineRow({
  months,
  placement,
  theme,
}: {
  months: TimelineMonth[];
  placement: { start: number; span: number } | null;
  theme: SectionTheme;
}) {
  const left = placement
    ? `${((placement.start - 1) / months.length) * 100}%`
    : "0%";
  const width = placement ? `${(placement.span / months.length) * 100}%` : "0%";

  return (
    <div className="relative h-17 overflow-hidden">
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${months.length}, minmax(72px, 1fr))`,
        }}
      >
        {months.map((month, index) => (
          <div
            key={month.key}
            className={`border-l border-slate-200 ${index % 2 === 0 ? "bg-slate-50/80" : "bg-white"}`}
          />
        ))}
      </div>
      {placement ? (
        <div className="pointer-events-none absolute inset-0 px-2">
          <div
            className={`absolute top-1/2 h-10 -translate-y-1/2 rounded-full ${theme.railClass}`}
            style={{ left, width }}
          >
            <div
              className={`absolute left-1.5 right-1.5 top-1/2 h-6 -translate-y-1/2 rounded-full bg-linear-to-r ${theme.barClass} shadow-sm`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectIndexPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { projectGuid: routeProjectGuid } = useParams();
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

  const selectedProjectGuid = routeProjectGuid ?? null;
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

  const reportingSections = useMemo(
    () => groupReportingSections(workspace?.reportingProgramme ?? []),
    [workspace?.reportingProgramme],
  );

  const timelineMonths = useMemo(
    () => buildTimelineMonths(workspace?.reportingProgramme ?? []),
    [workspace?.reportingProgramme],
  );

  function openProject(projectGuid: string) {
    navigate(`/project-index/${projectGuid}`);
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
    patch: Partial<Pick<ReportingProgrammeItem, "startDate" | "endDate">>,
  ) {
    if (!workspace) return;

    const existing = workspace.reportingProgramme.find(
      (item) => item.id === itemId,
    );
    const nextStart = patch.startDate ?? existing?.startDate ?? "";
    const nextEnd = patch.endDate ?? existing?.endDate ?? "";

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
    <div className="min-h-screen bg-[#f3f6f3] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/92 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4 lg:px-8 xl:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/apps"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#8fb73e] hover:text-[#025437]"
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
              <h1 className="text-[2rem] font-semibold tracking-tight">
                Planner workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${statusTone(saveState)}`}>
              {statusText(saveState)}
            </span>
            {workspace ? (
              <span className="hidden text-sm text-slate-500 xl:inline">
                Last updated by {workspace.summary.lastEditedBy} ·{" "}
                {workspace.summary.lastUpdatedAt}
              </span>
            ) : null}
            {user ? (
              <span className="hidden text-sm text-slate-500 lg:inline">
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 lg:px-8 xl:px-10">
        {error ? (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!selectedProjectGuid ? (
          <section className="space-y-6">
            <div className="rounded-4xl border border-white/70 bg-white px-8 py-8 shadow-[0_24px_70px_rgba(2,84,55,0.08)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Projects
                  </p>
                  <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                    Project list
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Start in the active project list, search by project ref or
                    site code, then open a project to move into the detailed
                    Project Index workspace.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-4 xl:max-w-3xl xl:flex-row xl:items-center xl:justify-end">
                  <div className="flex-1">
                    <label
                      htmlFor="project-search"
                      className="block text-sm font-medium text-slate-700"
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
                      className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-5 py-3.5 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={includeHistory}
                      onChange={(event) =>
                        setIncludeHistory(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#025437] focus:ring-[#8fb73e]"
                    />
                    Show History
                  </label>
                </div>
              </div>
            </div>

            {loadingProjects ? (
              <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-16 text-sm text-slate-500">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-16 text-sm text-slate-500">
                No projects match the current search.
              </div>
            ) : (
              <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-5 py-4">Project Ref</th>
                        <th className="px-5 py-4">Site Code</th>
                        <th className="px-5 py-4">Gateway</th>
                        <th className="px-5 py-4">Reporting Stage</th>
                        <th className="px-5 py-4">Project Status</th>
                        <th className="px-5 py-4">Reporting Status</th>
                        <th className="px-5 py-4">Responsible Manager</th>
                        <th className="px-5 py-4">Last Updated</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projects.map((project) => {
                        const canOpenCurrent =
                          !project.isActive &&
                          project.currentProjectGuid !== project.projectGuid;

                        return (
                          <tr
                            key={project.projectGuid}
                            className="hover:bg-[#f7fbf8]"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-950">
                                  {project.projectRef}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    project.isActive
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {project.isActive ? "Active" : "Historical"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {project.siteCode}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {project.gateway}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {project.reportingStage}
                            </td>
                            <td className="px-5 py-4 text-slate-900">
                              {project.projectStatus}
                            </td>
                            <td className="px-5 py-4 text-slate-900">
                              {project.reportingStatus}
                            </td>
                            <td className="px-5 py-4 text-slate-900">
                              {project.responsibleManager}
                            </td>
                            <td className="px-5 py-4 text-slate-900">
                              {project.lastUpdated}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                {canOpenCurrent ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProject(project.currentProjectGuid)
                                    }
                                    className="text-sm font-semibold text-[#025437] transition hover:text-[#01462e]"
                                  >
                                    Open current
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openProject(project.projectGuid)
                                  }
                                  className="inline-flex items-center gap-2 rounded-full bg-[#025437] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#01462e]"
                                >
                                  Open <span aria-hidden="true">›</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : loadingWorkspace || !workspace ? (
          <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading project workspace...
            </p>
          </div>
        ) : (
          <section className="space-y-6">
            <div className="rounded-4xl border border-white/70 bg-white px-8 py-8 shadow-[0_24px_70px_rgba(2,84,55,0.08)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate("/project-index")}
                    className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#025437] transition hover:text-[#01462e]"
                  >
                    <span aria-hidden="true">‹</span> Back to project list
                  </button>
                  <p className="text-sm font-semibold text-[#006838]">
                    {workspace.summary.projectRef}
                  </p>
                  <h2 className="mt-1 text-5xl font-semibold tracking-tight text-slate-950">
                    {workspace.summary.projectName ||
                      selectedProject?.projectRef}
                  </h2>
                  <p className="mt-3 text-base text-slate-500">
                    Site {workspace.summary.siteCode} · Planning{" "}
                    {workspace.summary.planningCode} · Contract{" "}
                    {workspace.summary.contractCode ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 xl:min-w-[320px]">
                  Last updated by {workspace.summary.lastEditedBy}
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {workspace.summary.lastUpdatedAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-white/70 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {majorTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    disabled={!tab.enabled}
                    onClick={() => tab.enabled && setActiveTab(tab.key)}
                    className={`rounded-3xl px-5 py-3 text-base font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-[#025437] text-white"
                        : tab.enabled
                          ? "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                          : "cursor-not-allowed text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "project-information" ? (
              <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="rounded-4xl border border-white/70 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setInfoSection("summary")}
                    className={`mb-2 block w-full rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                      infoSection === "summary"
                        ? "bg-[#f1f8f4] text-[#025437]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    Summary & Base Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setInfoSection("team")}
                    className={`block w-full rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                      infoSection === "team"
                        ? "bg-[#f1f8f4] text-[#025437]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    Project Team
                  </button>
                </aside>

                {infoSection === "summary" ? (
                  <div className="space-y-6">
                    <section className="rounded-4xl border border-white/70 bg-white p-7 shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-950">
                        Project summary
                      </h3>
                      <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Project Ref
                          </label>
                          <div className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            {workspace.summary.projectRef}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">
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
                            className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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

                    <section className="rounded-4xl border border-white/70 bg-white p-7 shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-950">
                        Base info
                      </h3>
                      <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
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
                          <label className="text-sm font-medium text-slate-700">
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
                            className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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
                      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Project Description
                          </label>
                          <textarea
                            rows={6}
                            value={workspace.summary.projectDescription}
                            onChange={(event) =>
                              setWorkspace((current) =>
                                current
                                  ? {
                                      ...current,
                                      summary: {
                                        ...current.summary,
                                        projectDescription: event.target.value,
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
                            className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                          />
                        </div>
                        <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
                          <label className="text-sm font-medium text-slate-700">
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
                            className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                          />
                          <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
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
                              "Add a Google Maps or coordinate link to surface an action here."
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <section className="rounded-4xl border border-white/70 bg-white p-7 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          Project team
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Directory-backed search will follow. The current slice
                          supports free-text entries and marks them as
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
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="pb-3 pr-3 font-medium">ID</th>
                            <th className="pb-3 pr-3 font-medium">Person</th>
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
                            <th className="pb-3 pr-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {workspace.teamMembers.map((member, index) => (
                            <tr key={member.id} className="align-top">
                              <td className="py-3 pr-3 text-slate-500">
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
                                              current.teamMembers.map((row) =>
                                                row.id === member.id
                                                  ? {
                                                      ...row,
                                                      personName:
                                                        event.target.value,
                                                    }
                                                  : row,
                                              ),
                                          }
                                        : current,
                                    )
                                  }
                                  onBlur={() => void handleTeamSave(member)}
                                  className="block min-w-45 rounded-2xl border border-slate-300 px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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
                                              current.teamMembers.map((row) =>
                                                row.id === member.id
                                                  ? {
                                                      ...row,
                                                      staffIdentifier:
                                                        event.target.value,
                                                      isUnverified: true,
                                                    }
                                                  : row,
                                              ),
                                          }
                                        : current,
                                    )
                                  }
                                  onBlur={() => void handleTeamSave(member)}
                                  className="block min-w-45 rounded-2xl border border-slate-300 px-3 py-2 outline-none transition focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
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
                                              current.teamMembers.map((row) =>
                                                row.id === member.id
                                                  ? { ...row, staffRole: value }
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
                                              current.teamMembers.map((row) =>
                                                row.id === member.id
                                                  ? { ...row, team: value }
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
                                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={member.isResponsibleManager}
                                    onChange={(event) => {
                                      const nextValue = event.target.checked;
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
                                    className="h-4 w-4 rounded border-slate-300 text-[#025437] focus:ring-[#8fb73e]"
                                  />
                                  Yes
                                </label>
                              </td>
                              <td className="py-3 pr-3 text-slate-700">
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
                                className="py-8 text-center text-sm text-slate-500"
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
              <section className="rounded-4xl border border-white/70 bg-white p-7 shadow-sm">
                <div className="mb-6 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-950">
                      Reporting Programme
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Table-based planner view with aligned dates and
                      colour-coded gantt bars.
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    Dates drive the timeline directly. Duration is calculated
                    automatically.
                  </div>
                </div>

                <div className="overflow-x-auto rounded-4xl border border-slate-200">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `${REPORTING_LEFT_WIDTH}px minmax(${TIMELINE_MIN_WIDTH}px, 1fr)`,
                      minWidth: REPORTING_LEFT_WIDTH + TIMELINE_MIN_WIDTH,
                    }}
                  >
                    <div
                      className="grid border-b border-r border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                      style={{ gridTemplateColumns: REPORTING_LEFT_GRID }}
                    >
                      <div className="px-4 py-4">Item</div>
                      <div className="px-3 py-4">Lvl</div>
                      <div className="px-3 py-4">Start</div>
                      <div className="px-3 py-4">End</div>
                      <div className="px-3 py-4">Duration</div>
                    </div>
                    <div className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <TimelineHeader months={timelineMonths} />
                    </div>

                    {reportingSections.map((section) => {
                      const theme = getSectionTheme(section.sectionCode);

                      return (
                        <Fragment key={section.sectionCode}>
                          <div
                            className={`border-b border-r px-4 py-3 text-sm font-semibold ${theme.headerClass}`}
                          >
                            {section.sectionLabel}
                          </div>
                          <div
                            className={`border-b px-0 py-0 ${theme.headerClass}`}
                          />

                          {section.items.map((item) => {
                            const placement = getTimelinePlacement(
                              item,
                              timelineMonths,
                            );

                            return (
                              <Fragment key={item.id}>
                                <div
                                  className="grid border-b border-r border-slate-200 bg-white hover:bg-slate-50/70"
                                  style={{
                                    gridTemplateColumns: REPORTING_LEFT_GRID,
                                  }}
                                >
                                  <div
                                    className={`px-4 py-3 ${theme.textClass}`}
                                    style={{
                                      boxShadow: `inset 4px 0 0 currentColor`,
                                    }}
                                  >
                                    <div className="text-sm font-medium text-current">
                                      {item.rowLabel}
                                    </div>
                                  </div>
                                  <div className="px-3 py-3 text-sm text-slate-600">
                                    {item.levelCode}
                                  </div>
                                  <div className="px-3 py-2">
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
                                                              event.target
                                                                .value,
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
                                      className={`min-w-0 w-full rounded-2xl border px-3 py-2 text-sm outline-none transition ${
                                        item.isEditable
                                          ? "border-slate-300 bg-white focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                          : "border-slate-200 bg-slate-50 text-slate-400"
                                      }`}
                                    />
                                  </div>
                                  <div className="px-3 py-2">
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
                                                              event.target
                                                                .value,
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
                                      className={`min-w-0 w-full rounded-2xl border px-3 py-2 text-sm outline-none transition ${
                                        item.isEditable
                                          ? "border-slate-300 bg-white focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                          : "border-slate-200 bg-slate-50 text-slate-400"
                                      }`}
                                    />
                                    {validation[`reporting-${item.id}`] ? (
                                      <p className="mt-2 text-xs text-red-600">
                                        {validation[`reporting-${item.id}`]}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-slate-600">
                                    {getDurationLabel(item)}
                                  </div>
                                </div>
                                <div className="border-b border-slate-200 bg-white hover:bg-slate-50/70">
                                  <TimelineRow
                                    months={timelineMonths}
                                    placement={placement}
                                    theme={theme}
                                  />
                                </div>
                              </Fragment>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : activeTab === "target-programme" ? (
              <PlaceholderPanel title="Target Programme" />
            ) : activeTab === "tenure" ? (
              <PlaceholderPanel title="Tenure" />
            ) : (
              <PlaceholderPanel title="Board Report" />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
