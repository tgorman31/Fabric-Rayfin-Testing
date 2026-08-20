import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type TimelineScale = "year" | "quarter" | "month" | "week" | "day";

type TimelineRange = {
  start: Date;
  end: Date;
  totalDays: number;
};

type TimelineSegment = {
  key: string;
  label: string;
  spanDays: number;
};

type TimelineDragState = {
  itemId: string;
  edge: "start" | "end";
  rowLeft: number;
  dayWidth: number;
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

type MapViewport = {
  centerLat: number;
  centerLng: number;
  zoom: number;
};

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type MapProjectPoint = ProjectListItem & {
  countyLabel: string;
  lat: number;
  lng: number;
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
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TIMELINE_DAY_WIDTH: Record<TimelineScale, number> = {
  year: 2,
  quarter: 4,
  month: 8,
  week: 16,
  day: 28,
};
const TIMELINE_SCALE_ORDER: TimelineScale[] = [
  "year",
  "quarter",
  "month",
  "week",
  "day",
];
const TIMELINE_SCALE_LABELS: Record<TimelineScale, string> = {
  year: "Year",
  quarter: "Quarters",
  month: "Months",
  week: "Weeks",
  day: "Days",
};
const MAP_MIN_LAT = 51.2;
const MAP_MAX_LAT = 55.6;
const MAP_MIN_LNG = -10.9;
const MAP_MAX_LNG = -5.1;
const DEFAULT_MAP_VIEWPORT: MapViewport = {
  centerLat: 53.35,
  centerLng: -8.0,
  zoom: 1,
};

const countyAnchors: Record<
  string,
  { label: string; lat: number; lng: number }
> = {
  C: { label: "Cork", lat: 51.8985, lng: -8.4756 },
  CE: { label: "Clare", lat: 52.847, lng: -8.986 },
  CN: { label: "Cavan", lat: 53.99, lng: -7.36 },
  CW: { label: "Carlow", lat: 52.84, lng: -6.93 },
  D: { label: "Dublin", lat: 53.3498, lng: -6.2603 },
  DL: { label: "Donegal", lat: 54.654, lng: -8.11 },
  G: { label: "Galway", lat: 53.2707, lng: -9.0568 },
  KE: { label: "Kildare", lat: 53.16, lng: -6.91 },
  KK: { label: "Kilkenny", lat: 52.654, lng: -7.2448 },
  KY: { label: "Kerry", lat: 52.1545, lng: -9.5669 },
  L: { label: "Limerick", lat: 52.6638, lng: -8.6267 },
  LD: { label: "Longford", lat: 53.72, lng: -7.8 },
  LH: { label: "Louth", lat: 53.95, lng: -6.54 },
  LM: { label: "Leitrim", lat: 54.12, lng: -8.0 },
  LS: { label: "Laois", lat: 53.03, lng: -7.3 },
  MH: { label: "Meath", lat: 53.61, lng: -6.66 },
  MN: { label: "Monaghan", lat: 54.25, lng: -6.97 },
  MO: { label: "Mayo", lat: 53.85, lng: -9.3 },
  OY: { label: "Offaly", lat: 53.27, lng: -7.49 },
  RN: { label: "Roscommon", lat: 53.63, lng: -8.19 },
  SO: { label: "Sligo", lat: 54.27, lng: -8.48 },
  T: { label: "Tipperary", lat: 52.47, lng: -8.16 },
  W: { label: "Waterford", lat: 52.2593, lng: -7.1101 },
  WD: { label: "Wicklow", lat: 53.0, lng: -6.35 },
  WH: { label: "Westmeath", lat: 53.53, lng: -7.34 },
  WX: { label: "Wexford", lat: 52.3369, lng: -6.4633 },
};

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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
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

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function endOfQuarter(date: Date): Date {
  return endOfMonth(
    new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 2, 1),
  );
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, delta));
}

function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

function getDaysDiff(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY,
  );
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

function buildTimelineRange(items: ReportingProgrammeItem[]): TimelineRange {
  const dates = items
    .flatMap((item) => [item.startDate, item.endDate])
    .filter(Boolean)
    .map((value) => dateFromInput(value as string))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime());

  const earliest = dates[0] ?? startOfDay(new Date());
  const latest = dates[dates.length - 1] ?? addMonths(earliest, 7);
  const start = startOfMonth(earliest);
  const end = endOfMonth(latest);

  return {
    start,
    end,
    totalDays: getDaysDiff(start, end) + 1,
  };
}

function getTimelinePlacement(
  item: ReportingProgrammeItem,
  timelineRange: TimelineRange,
  dayWidth: number,
): { left: number; width: number } | null {
  const startSource =
    dateFromInput(item.startDate) ?? dateFromInput(item.endDate);
  const endSource =
    dateFromInput(item.endDate) ?? dateFromInput(item.startDate);

  if (!startSource || !endSource) return null;

  const itemStart = startOfDay(startSource);
  const itemEnd = startOfDay(endSource < startSource ? startSource : endSource);
  const left = clamp(
    getDaysDiff(timelineRange.start, itemStart) * dayWidth,
    0,
    timelineRange.totalDays * dayWidth,
  );
  const width = Math.max(
    dayWidth,
    (getDaysDiff(itemStart, itemEnd) + 1) * dayWidth,
  );

  return { left, width };
}

function buildTimelineSegments(
  range: TimelineRange,
  mode: "year" | "quarter" | "month" | "week" | "day",
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let cursor = startOfDay(range.start);

  while (cursor <= range.end) {
    let segmentStart = cursor;
    let segmentEnd = cursor;
    let label = "";

    if (mode === "year") {
      segmentStart = new Date(cursor.getFullYear(), 0, 1);
      segmentEnd = new Date(cursor.getFullYear(), 11, 31);
      label = String(cursor.getFullYear());
    } else if (mode === "quarter") {
      segmentStart = startOfQuarter(cursor);
      segmentEnd = endOfQuarter(cursor);
      label = `Q${Math.floor(cursor.getMonth() / 3) + 1}`;
    } else if (mode === "month") {
      segmentStart = startOfMonth(cursor);
      segmentEnd = endOfMonth(cursor);
      label = formatMonthLabel(cursor).toUpperCase();
    } else if (mode === "week") {
      segmentStart = startOfWeek(cursor);
      segmentEnd = endOfWeek(cursor);
      label = `W${Math.ceil((getDaysDiff(new Date(cursor.getFullYear(), 0, 1), cursor) + 1) / 7)}`;
    } else {
      segmentStart = startOfDay(cursor);
      segmentEnd = startOfDay(cursor);
      label = String(cursor.getDate()).padStart(2, "0");
    }

    const clampedStart =
      segmentStart < range.start ? range.start : segmentStart;
    const clampedEnd = segmentEnd > range.end ? range.end : segmentEnd;
    const spanDays = getDaysDiff(clampedStart, clampedEnd) + 1;

    segments.push({
      key: `${mode}-${clampedStart.toISOString()}`,
      label,
      spanDays,
    });

    cursor = addDays(clampedEnd, 1);
  }

  return segments;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractCountyPrefix(siteCode: string): string {
  return siteCode.match(/^[A-Z]+/)?.[0] ?? "";
}

function hashText(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100000;
  }
  return hash;
}

function getCountyAnchor(siteCode: string) {
  const prefix = extractCountyPrefix(siteCode);
  return (
    countyAnchors[prefix] ??
    countyAnchors[prefix.slice(0, 1)] ?? {
      label: "Ireland",
      lat: 53.35,
      lng: -8.0,
    }
  );
}

function buildProjectMapPoint(project: ProjectListItem): MapProjectPoint {
  const anchor = getCountyAnchor(project.siteCode);
  const hash = hashText(project.siteCode);
  const latOffset = ((hash % 17) - 8) * 0.035;
  const lngOffset = ((Math.floor(hash / 17) % 17) - 8) * 0.05;

  return {
    ...project,
    countyLabel: anchor.label,
    lat: clamp(anchor.lat + latOffset, MAP_MIN_LAT, MAP_MAX_LAT),
    lng: clamp(anchor.lng + lngOffset, MAP_MIN_LNG, MAP_MAX_LNG),
  };
}

function getMapBounds(viewport: MapViewport): MapBounds {
  const latSpan = (MAP_MAX_LAT - MAP_MIN_LAT) / viewport.zoom;
  const lngSpan = (MAP_MAX_LNG - MAP_MIN_LNG) / viewport.zoom;

  return {
    minLat: viewport.centerLat - latSpan / 2,
    maxLat: viewport.centerLat + latSpan / 2,
    minLng: viewport.centerLng - lngSpan / 2,
    maxLng: viewport.centerLng + lngSpan / 2,
  };
}

function clampViewport(viewport: MapViewport): MapViewport {
  const latSpan = (MAP_MAX_LAT - MAP_MIN_LAT) / viewport.zoom;
  const lngSpan = (MAP_MAX_LNG - MAP_MIN_LNG) / viewport.zoom;

  return {
    zoom: clamp(viewport.zoom, 1, 5),
    centerLat: clamp(
      viewport.centerLat,
      MAP_MIN_LAT + latSpan / 2,
      MAP_MAX_LAT - latSpan / 2,
    ),
    centerLng: clamp(
      viewport.centerLng,
      MAP_MIN_LNG + lngSpan / 2,
      MAP_MAX_LNG - lngSpan / 2,
    ),
  };
}

function isPointInBounds(
  point: Pick<MapProjectPoint, "lat" | "lng">,
  bounds: MapBounds,
): boolean {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}

function getMapPointPosition(
  point: Pick<MapProjectPoint, "lat" | "lng">,
  bounds: MapBounds,
) {
  return {
    left: ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    top: ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 100,
  };
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

function TimelineHeader({
  range,
  scale,
  dayWidth,
}: {
  range: TimelineRange;
  scale: TimelineScale;
  dayWidth: number;
}) {
  const topSegments = useMemo(
    () => buildTimelineSegments(range, "year"),
    [range],
  );
  const bottomSegments = useMemo(
    () => buildTimelineSegments(range, scale === "year" ? "quarter" : scale),
    [range, scale],
  );

  return (
    <div
      className="border-l border-slate-200"
      style={{ width: range.totalDays * dayWidth }}
    >
      <div className="flex border-b border-slate-200">
        {topSegments.map((segment) => (
          <div
            key={segment.key}
            className="flex h-9 items-center justify-center border-l border-slate-200 bg-slate-100 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] whitespace-nowrap text-slate-500 first:border-l-0"
            style={{ width: segment.spanDays * dayWidth }}
          >
            {segment.label}
          </div>
        ))}
      </div>
      <div className="flex">
        {bottomSegments.map((segment, index) => (
          <div
            key={segment.key}
            className={`flex h-11 items-center justify-center border-l border-slate-200 px-2 text-center text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap text-slate-500 first:border-l-0 ${
              index % 2 === 0 ? "bg-slate-50" : "bg-white"
            }`}
            style={{ width: segment.spanDays * dayWidth }}
          >
            {segment.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({
  item,
  range,
  scale,
  dayWidth,
  placement,
  theme,
  onResizeStart,
}: {
  item: ReportingProgrammeItem;
  range: TimelineRange;
  scale: TimelineScale;
  dayWidth: number;
  placement: { left: number; width: number } | null;
  theme: SectionTheme;
  onResizeStart: (
    event: React.PointerEvent<HTMLButtonElement>,
    item: ReportingProgrammeItem,
    edge: "start" | "end",
    rowElement: HTMLDivElement | null,
  ) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const segments = useMemo(
    () => buildTimelineSegments(range, scale === "year" ? "quarter" : scale),
    [range, scale],
  );

  return (
    <div
      ref={rowRef}
      className="relative h-21 overflow-hidden"
      style={{ width: range.totalDays * dayWidth }}
    >
      <div className="flex h-full">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            className={`h-full border-l border-slate-200 first:border-l-0 ${
              index % 2 === 0 ? "bg-slate-50/80" : "bg-white"
            }`}
            style={{ width: segment.spanDays * dayWidth }}
          />
        ))}
      </div>
      {placement ? (
        <div className="absolute inset-0">
          <div
            className={`absolute top-1/2 h-11 -translate-y-1/2 rounded-full ${theme.railClass}`}
            style={{ left: placement.left, width: placement.width }}
          >
            <div
              className={`absolute inset-x-1.5 top-1/2 h-7 -translate-y-1/2 rounded-full bg-linear-to-r ${theme.barClass} shadow-sm`}
            />
            {item.isEditable ? (
              <>
                <button
                  type="button"
                  onPointerDown={(event) =>
                    onResizeStart(event, item, "start", rowRef.current)
                  }
                  className="absolute left-1 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white/80 bg-white/90 shadow-sm"
                  aria-label={`Adjust start date for ${item.rowLabel}`}
                />
                <button
                  type="button"
                  onPointerDown={(event) =>
                    onResizeStart(event, item, "end", rowRef.current)
                  }
                  className="absolute right-1 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white/80 bg-white/90 shadow-sm"
                  aria-label={`Adjust end date for ${item.rowLabel}`}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectLocationMap({
  points,
  viewport,
  selectedProjectGuid,
  onViewportChange,
  onOpenProject,
}: {
  points: MapProjectPoint[];
  viewport: MapViewport;
  selectedProjectGuid: string | null;
  onViewportChange: (viewport: MapViewport) => void;
  onOpenProject: (projectGuid: string) => void;
}) {
  const bounds = useMemo(() => getMapBounds(viewport), [viewport]);
  const visiblePoints = useMemo(
    () => points.filter((point) => isPointInBounds(point, bounds)),
    [bounds, points],
  );
  const mapRef = useRef<HTMLDivElement | null>(null);

  const focusViewportFromInteraction = useCallback(
    (
      clientX: number,
      clientY: number,
      container: HTMLDivElement,
      nextZoom: number,
    ) => {
      const rect = container.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      const focusLng = bounds.minLng + x * (bounds.maxLng - bounds.minLng);
      const focusLat = bounds.maxLat - y * (bounds.maxLat - bounds.minLat);
      const latSpan = (MAP_MAX_LAT - MAP_MIN_LAT) / nextZoom;
      const lngSpan = (MAP_MAX_LNG - MAP_MIN_LNG) / nextZoom;

      onViewportChange(
        clampViewport({
          centerLat: focusLat + (y - 0.5) * latSpan,
          centerLng: focusLng - (x - 0.5) * lngSpan,
          zoom: nextZoom,
        }),
      );
    },
    [bounds, onViewportChange],
  );

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;
    const mapElement = container;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
      const deltaSource = event.ctrlKey ? event.deltaY / 40 : event.deltaY;
      const delta = deltaSource < 0 ? 0.35 : -0.35;
      const nextZoom = clamp(viewport.zoom + delta, 1, 5);
      focusViewportFromInteraction(
        event.clientX,
        event.clientY,
        mapElement,
        nextZoom,
      );
    }

    mapElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => mapElement.removeEventListener("wheel", handleWheel);
  }, [focusViewportFromInteraction, viewport.zoom]);

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Project map</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ireland placeholder view using county-based positions from the
            site-code prefix. Zooming filters the list to projects inside the
            current view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onViewportChange(
                clampViewport({ ...viewport, zoom: viewport.zoom - 0.4 }),
              )
            }
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            −
          </button>
          <button
            type="button"
            onClick={() =>
              onViewportChange(
                clampViewport({ ...viewport, zoom: viewport.zoom + 0.4 }),
              )
            }
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onViewportChange(DEFAULT_MAP_VIEWPORT)}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Reset view
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        className="relative h-140 overflow-hidden rounded-4xl border border-slate-200 bg-linear-to-br from-slate-100 via-emerald-50 to-cyan-50 overscroll-contain touch-none"
        style={{ touchAction: "none" }}
        onClick={(event) => {
          focusViewportFromInteraction(
            event.clientX,
            event.clientY,
            event.currentTarget,
            viewport.zoom,
          );
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(2,84,55,0.08),transparent_45%),linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-size-[auto,16%,16%]" />
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d="M26 17 L34 10 L45 11 L53 16 L61 15 L70 24 L75 36 L78 50 L75 64 L80 77 L76 92 L68 103 L60 110 L58 121 L47 130 L36 127 L30 118 L22 114 L16 101 L12 89 L15 76 L13 63 L17 50 L15 39 L20 28 Z"
            fill="rgba(255,255,255,0.72)"
            stroke="rgba(2,84,55,0.24)"
            strokeWidth="1.5"
          />
          <path
            d="M64 18 L71 17 L77 21 L80 27 L77 33 L70 35 L65 31 L63 24 Z"
            fill="rgba(255,255,255,0.68)"
            stroke="rgba(2,84,55,0.22)"
            strokeWidth="1.2"
          />
        </svg>

        {visiblePoints.map((point) => {
          const position = getMapPointPosition(point, bounds);
          const isSelected = point.projectGuid === selectedProjectGuid;

          return (
            <button
              key={point.projectGuid}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewportChange(
                  clampViewport({
                    ...viewport,
                    centerLat: point.lat,
                    centerLng: point.lng,
                  }),
                );
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onOpenProject(point.projectGuid);
              }}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? "z-20" : "z-10"}`}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
              title={`${point.projectRef} · ${point.projectName || point.siteCode}`}
            >
              <span
                className={`block h-4 w-4 rounded-full border-2 border-white shadow-md transition ${
                  isSelected
                    ? "bg-[#025437]"
                    : "bg-[#8fb73e] group-hover:bg-[#006838]"
                }`}
              />
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 rounded-full bg-slate-950/90 px-3 py-1 text-xs font-medium whitespace-nowrap text-white group-hover:block">
                {point.projectRef}
              </span>
            </button>
          );
        })}

        <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
          Zoom {viewport.zoom.toFixed(1)}×
          <div className="mt-1 text-[11px] text-slate-500">
            Pinch or wheel inside map to zoom · click to re-centre ·
            double-click marker to open
          </div>
        </div>
        <div className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
          {visiblePoints.length} projects in view
        </div>
      </div>
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
  const [mapViewport, setMapViewport] =
    useState<MapViewport>(DEFAULT_MAP_VIEWPORT);
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [timelineDragState, setTimelineDragState] =
    useState<TimelineDragState | null>(null);
  const workspaceRef = useRef<ProjectIndexWorkspace | null>(null);

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

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const selectedProject = useMemo(
    () =>
      projects.find((project) => project.projectGuid === selectedProjectGuid) ??
      null,
    [projects, selectedProjectGuid],
  );

  const projectMapPoints = useMemo(
    () => projects.map(buildProjectMapPoint),
    [projects],
  );

  const visibleMapBounds = useMemo(
    () => getMapBounds(mapViewport),
    [mapViewport],
  );

  const visibleProjectGuids = useMemo(
    () =>
      new Set(
        projectMapPoints
          .filter((point) => isPointInBounds(point, visibleMapBounds))
          .map((point) => point.projectGuid),
      ),
    [projectMapPoints, visibleMapBounds],
  );

  const visibleProjects = useMemo(
    () =>
      projects.filter((project) =>
        visibleProjectGuids.has(project.projectGuid),
      ),
    [projects, visibleProjectGuids],
  );

  const reportingSections = useMemo(
    () => groupReportingSections(workspace?.reportingProgramme ?? []),
    [workspace?.reportingProgramme],
  );

  const timelineRange = useMemo(
    () => buildTimelineRange(workspace?.reportingProgramme ?? []),
    [workspace?.reportingProgramme],
  );

  const timelineDayWidth = TIMELINE_DAY_WIDTH[timelineScale];
  const timelineWidth = timelineRange.totalDays * timelineDayWidth;

  useEffect(() => {
    if (!timelineDragState) return;

    const dragState = timelineDragState;

    function updateDraggedDate(clientX: number) {
      const dayIndex = clamp(
        Math.round((clientX - dragState.rowLeft) / dragState.dayWidth),
        0,
        Math.max(0, timelineRange.totalDays - 1),
      );
      const targetDate = addDays(timelineRange.start, dayIndex);
      const nextValue = formatDateInput(targetDate);

      setWorkspace((current) => {
        if (!current) return current;

        return {
          ...current,
          reportingProgramme: current.reportingProgramme.map((item) => {
            if (item.id !== dragState.itemId) return item;

            const startDate = item.startDate || item.endDate;
            const endDate = item.endDate || item.startDate;

            if (dragState.edge === "start") {
              const safeEnd =
                endDate && nextValue > endDate ? nextValue : endDate;
              return { ...item, startDate: nextValue, endDate: safeEnd };
            }

            const safeStart =
              startDate && nextValue < startDate ? nextValue : startDate;
            return { ...item, startDate: safeStart, endDate: nextValue };
          }),
        };
      });
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      updateDraggedDate(event.clientX);
    }

    function handlePointerUp() {
      const currentItem = workspaceRef.current?.reportingProgramme.find(
        (item) => item.id === dragState.itemId,
      );

      if (currentItem) {
        setSaveState("saving");
        void updateReportingProgrammeItem(dragState.itemId, {
          startDate: currentItem.startDate,
          endDate: currentItem.endDate,
        })
          .then(() => {
            setWorkspace((current) =>
              current
                ? {
                    ...current,
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
          })
          .catch((err) => {
            setSaveState("error");
            setError(
              err instanceof Error
                ? err.message
                : "Unable to save reporting item.",
            );
          });
      }

      setTimelineDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [timelineDragState, timelineRange, user?.email]);

  function openProject(projectGuid: string) {
    navigate(`/project-index/${projectGuid}`);
  }

  function beginTimelineResize(
    event: React.PointerEvent<HTMLButtonElement>,
    item: ReportingProgrammeItem,
    edge: "start" | "end",
    rowElement: HTMLDivElement | null,
  ) {
    if (!item.isEditable || !rowElement || timelineRange.totalDays === 0)
      return;

    event.preventDefault();
    event.stopPropagation();

    const rect = rowElement.getBoundingClientRect();
    setTimelineDragState({
      itemId: item.id,
      edge,
      rowLeft: rect.left,
      dayWidth: rect.width / timelineRange.totalDays,
    });
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
                      Search by project ref, site code, or project name
                    </label>
                    <input
                      id="project-search"
                      type="search"
                      value={searchText}
                      onChange={(event) =>
                        setSearchText(event.target.value.toUpperCase())
                      }
                      placeholder="D012-01, D012, or Ballymun Phase 2"
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
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,1fr)]">
                <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    <span>
                      Showing {visibleProjects.length} of {projects.length}{" "}
                      projects
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Map view filter
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <th className="px-5 py-4">Project Ref</th>
                          <th className="px-5 py-4">Site Code</th>
                          <th className="px-5 py-4">Project Name</th>
                          <th className="px-5 py-4">Gateway</th>
                          <th className="px-5 py-4">Reporting Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleProjects.map((project) => {
                          const canOpenCurrent =
                            !project.isActive &&
                            project.currentProjectGuid !== project.projectGuid;

                          return (
                            <tr
                              key={project.projectGuid}
                              className="cursor-pointer hover:bg-[#f7fbf8]"
                              onClick={() => openProject(project.projectGuid)}
                            >
                              <td className="px-5 py-4 align-top">
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
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#025437]">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openProject(project.projectGuid);
                                    }}
                                    className="transition hover:text-[#01462e]"
                                  >
                                    Open
                                  </button>
                                  {canOpenCurrent ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openProject(project.currentProjectGuid);
                                      }}
                                      className="transition hover:text-[#01462e]"
                                    >
                                      Open current
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {project.siteCode}
                              </td>
                              <td className="px-5 py-4 text-slate-900">
                                {project.projectName || "—"}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {project.gateway}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {project.reportingStage}
                              </td>
                            </tr>
                          );
                        })}
                        {visibleProjects.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-12 text-center text-sm text-slate-500"
                            >
                              No projects are in the current map view. Reset or
                              zoom out to widen the list.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <ProjectLocationMap
                  points={projectMapPoints}
                  viewport={mapViewport}
                  selectedProjectGuid={selectedProjectGuid}
                  onViewportChange={setMapViewport}
                  onOpenProject={openProject}
                />
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
                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <div className="text-sm text-slate-500">
                      Dates drive the timeline directly. Duration is calculated
                      automatically.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TIMELINE_SCALE_ORDER.map((scaleOption) => (
                        <button
                          key={scaleOption}
                          type="button"
                          onClick={() => setTimelineScale(scaleOption)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            timelineScale === scaleOption
                              ? "bg-[#025437] text-white"
                              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {TIMELINE_SCALE_LABELS[scaleOption]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-4xl border border-slate-200">
                  <div className="flex">
                    <div
                      className="shrink-0 border-r border-slate-200 bg-white"
                      style={{ width: REPORTING_LEFT_WIDTH }}
                    >
                      <div
                        className="grid border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                        style={{
                          gridTemplateColumns: REPORTING_LEFT_GRID,
                          height: 80,
                        }}
                      >
                        <div className="flex items-center px-4">Item</div>
                        <div className="flex items-center px-3">Lvl</div>
                        <div className="flex items-center px-3">Start</div>
                        <div className="flex items-center px-3">End</div>
                        <div className="flex items-center px-3">Duration</div>
                      </div>

                      {reportingSections.map((section) => {
                        const theme = getSectionTheme(section.sectionCode);

                        return (
                          <Fragment key={section.sectionCode}>
                            <div
                              className={`flex h-12 items-center border-b border-slate-200 px-4 text-sm font-semibold ${theme.headerClass}`}
                            >
                              {section.sectionLabel}
                            </div>

                            {section.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid border-b border-slate-200 bg-white hover:bg-slate-50/70"
                                style={{
                                  gridTemplateColumns: REPORTING_LEFT_GRID,
                                  minHeight: 84,
                                }}
                              >
                                <div
                                  className={`flex items-center px-4 py-3 ${theme.textClass}`}
                                  style={{
                                    boxShadow: `inset 4px 0 0 currentColor`,
                                  }}
                                >
                                  <div className="text-sm font-medium text-current">
                                    {item.rowLabel}
                                  </div>
                                </div>
                                <div className="flex items-center px-3 text-sm text-slate-600">
                                  {item.levelCode}
                                </div>
                                <div className="flex items-center px-3 py-2">
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
                                    className={`min-w-0 w-full rounded-2xl border px-3 py-2 text-sm outline-none transition ${
                                      item.isEditable
                                        ? "border-slate-300 bg-white focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20"
                                        : "border-slate-200 bg-slate-50 text-slate-400"
                                    }`}
                                  />
                                </div>
                                <div className="flex items-center px-3 py-2">
                                  <div className="w-full">
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
                                      <p className="mt-1 text-[11px] text-red-600">
                                        {validation[`reporting-${item.id}`]}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-center px-3 text-sm text-slate-600">
                                  {getDurationLabel(item)}
                                </div>
                              </div>
                            ))}
                          </Fragment>
                        );
                      })}
                    </div>

                    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden bg-white">
                      <div style={{ width: timelineWidth }}>
                        <div className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <TimelineHeader
                            range={timelineRange}
                            scale={timelineScale}
                            dayWidth={timelineDayWidth}
                          />
                        </div>

                        {reportingSections.map((section) => {
                          const theme = getSectionTheme(section.sectionCode);

                          return (
                            <Fragment key={section.sectionCode}>
                              <div
                                className={`h-12 border-b border-slate-200 ${theme.headerClass}`}
                                style={{ width: timelineWidth }}
                              />
                              {section.items.map((item) => {
                                const placement = getTimelinePlacement(
                                  item,
                                  timelineRange,
                                  timelineDayWidth,
                                );

                                return (
                                  <div
                                    key={item.id}
                                    className="border-b border-slate-200 bg-white hover:bg-slate-50/70"
                                  >
                                    <TimelineRow
                                      item={item}
                                      range={timelineRange}
                                      scale={timelineScale}
                                      dayWidth={timelineDayWidth}
                                      placement={placement}
                                      theme={theme}
                                      onResizeStart={beginTimelineResize}
                                    />
                                  </div>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
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
