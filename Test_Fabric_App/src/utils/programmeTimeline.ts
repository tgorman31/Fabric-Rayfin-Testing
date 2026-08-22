export type TimelineScale = "year" | "quarter" | "month" | "week" | "day";

export interface ProgrammeTimelineItem {
  id: string;
  rowLabel: string;
  isEditable: boolean;
  isMilestone?: boolean;
  startDate: string;
  endDate: string;
}

export type TimelineRange = {
  start: Date;
  end: Date;
  totalDays: number;
};

export type TimelineSegment = {
  key: string;
  label: string;
  spanDays: number;
};

export type TimelineHeaderRow = {
  scale: TimelineScale | "quarter";
  tone: "top" | "mid" | "bottom";
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const TIMELINE_HEADER_ROW_HEIGHT = 40;

export const TIMELINE_ZOOM_STEPS: Array<{
  scale: TimelineScale;
  dayWidth: number;
  label: string;
}> = [
  { scale: "year", dayWidth: 1.5, label: "Year" },
  { scale: "year", dayWidth: 2.25, label: "Year" },
  { scale: "quarter", dayWidth: 3.25, label: "Quarter" },
  { scale: "quarter", dayWidth: 4.5, label: "Quarter" },
  { scale: "month", dayWidth: 7, label: "Month" },
  { scale: "month", dayWidth: 9.5, label: "Month" },
  { scale: "week", dayWidth: 14, label: "Week" },
  { scale: "week", dayWidth: 19, label: "Week" },
  { scale: "day", dayWidth: 26, label: "Day" },
  { scale: "day", dayWidth: 34, label: "Day" },
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

export function monthDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
}

export function dateFromInput(value: string): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

export function endOfQuarter(date: Date): Date {
  return endOfMonth(new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 2, 1));
}

export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  return startOfDay(addDays(date, day === 0 ? -6 : 1 - day));
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function getDaysDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function getDurationLabel(item: ProgrammeTimelineItem): string {
  const start = dateFromInput(item.startDate);
  const end = dateFromInput(item.endDate);
  if (!start && !end) return "—";
  if (!start || !end) return "1 mo";
  return `${Math.max(1, monthDiff(startOfMonth(start), startOfMonth(end)) + 1)} mo`;
}

export function buildTimelineRange(items: ProgrammeTimelineItem[]): TimelineRange {
  const dates = items
    .flatMap((item) => [item.startDate, item.endDate])
    .filter(Boolean)
    .map((value) => dateFromInput(value))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime());
  const earliest = dates[0] ?? startOfDay(new Date());
  const latest = dates[dates.length - 1] ?? addMonths(earliest, 7);
  const start = startOfMonth(earliest);
  const end = endOfMonth(latest);
  return { start, end, totalDays: getDaysDiff(start, end) + 1 };
}

export function getTimelinePlacement(item: ProgrammeTimelineItem, range: TimelineRange, dayWidth: number) {
  const startSource = dateFromInput(item.startDate) ?? dateFromInput(item.endDate);
  const endSource = dateFromInput(item.endDate) ?? dateFromInput(item.startDate);
  if (!startSource || !endSource) return null;
  const itemStart = startOfDay(startSource);
  const itemEnd = startOfDay(endSource < startSource ? startSource : endSource);
  return {
    left: clamp(getDaysDiff(range.start, itemStart) * dayWidth, 0, range.totalDays * dayWidth),
    width: Math.max(dayWidth, (getDaysDiff(itemStart, itemEnd) + 1) * dayWidth),
  };
}

export function buildTimelineSegments(range: TimelineRange, mode: TimelineScale | "quarter"): TimelineSegment[] {
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
    const clampedStart = segmentStart < range.start ? range.start : segmentStart;
    const clampedEnd = segmentEnd > range.end ? range.end : segmentEnd;
    segments.push({ key: `${mode}-${clampedStart.toISOString()}`, label, spanDays: getDaysDiff(clampedStart, clampedEnd) + 1 });
    cursor = addDays(clampedEnd, 1);
  }
  return segments;
}

export function getTimelineHeaderRows(scale: TimelineScale): TimelineHeaderRow[] {
  if (scale === "year") return [{ scale: "year", tone: "top" }, { scale: "quarter", tone: "bottom" }];
  if (scale === "quarter") return [{ scale: "year", tone: "top" }, { scale: "month", tone: "bottom" }];
  if (scale === "month") return [{ scale: "year", tone: "top" }, { scale: "quarter", tone: "mid" }, { scale: "month", tone: "bottom" }];
  return [{ scale: "year", tone: "top" }, { scale: "month", tone: "mid" }, { scale, tone: "bottom" }];
}

export function getTimelineGridScale(scale: TimelineScale): TimelineScale | "quarter" {
  return scale === "year" ? "quarter" : scale;
}

export function getTimelineSnapDate(date: Date, scale: TimelineScale, edge: "start" | "end"): Date {
  if (scale === "year") return edge === "start" ? startOfQuarter(date) : endOfQuarter(date);
  if (scale === "quarter") return edge === "start" ? startOfMonth(date) : endOfMonth(date);
  if (scale === "month") return edge === "start" ? startOfWeek(date) : endOfWeek(date);
  return startOfDay(date);
}

export function snapTimelineMoveDate(date: Date, scale: TimelineScale): Date {
  if (scale === "year") return startOfQuarter(date);
  if (scale === "quarter") return startOfMonth(date);
  if (scale === "month") return startOfWeek(date);
  return startOfDay(date);
}

export function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function clampDate(date: Date, min: Date, max: Date): Date {
  return new Date(clamp(date.getTime(), min.getTime(), max.getTime()));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
