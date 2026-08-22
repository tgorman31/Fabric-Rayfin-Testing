import { useMemo, useRef } from "react";
import type { PointerEvent } from "react";
import { buildTimelineSegments, getTimelineGridScale, type ProgrammeTimelineItem, type TimelineRange, type TimelineScale } from "@/utils/programmeTimeline";

export type ProgrammeTimelineTheme = { barClass: string; railClass: string };

type Props = {
  item: ProgrammeTimelineItem;
  range: TimelineRange;
  scale: TimelineScale;
  dayWidth: number;
  placement: { left: number; width: number } | null;
  theme: ProgrammeTimelineTheme;
  onResizeStart: (event: PointerEvent<HTMLButtonElement>, item: ProgrammeTimelineItem, edge: "start" | "end", rowElement: HTMLDivElement | null) => void;
  onMoveStart: (event: PointerEvent<HTMLDivElement>, item: ProgrammeTimelineItem, rowElement: HTMLDivElement | null, dayWidth: number) => void;
};

export function ProgrammeTimelineRow({ item, range, scale, dayWidth, placement, theme, onResizeStart, onMoveStart }: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const segments = useMemo(() => buildTimelineSegments(range, getTimelineGridScale(scale)), [range, scale]);
  return <div ref={rowRef} className="relative h-21 overflow-hidden" style={{ width: range.totalDays * dayWidth }}>
    <div className="flex h-full">{segments.map((segment, index) => <div key={segment.key} className={`h-full border-l border-slate-200 first:border-l-0 ${index % 2 === 0 ? "bg-slate-50/80" : "bg-white"}`} style={{ width: segment.spanDays * dayWidth }} />)}</div>
    {placement ? <div className="absolute inset-0">
      {item.isMilestone ? <div className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${theme.railClass}`} style={{ left: placement.left + dayWidth / 2 }} aria-label={`${item.rowLabel} milestone`} /> : <div className={`absolute top-1/2 h-11 -translate-y-1/2 rounded-full ${theme.railClass}`} style={{ left: placement.left, width: placement.width }}>
        <div onPointerDown={(event) => item.isEditable ? onMoveStart(event, item, rowRef.current, dayWidth) : undefined} className={`absolute inset-x-1.5 top-1/2 h-7 -translate-y-1/2 rounded-full bg-linear-to-r ${theme.barClass} shadow-sm ${item.isEditable ? "cursor-grab active:cursor-grabbing" : ""}`} />
        {item.isEditable ? <><button type="button" onPointerDown={(event) => onResizeStart(event, item, "start", rowRef.current)} className="absolute left-1 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white/80 bg-white/90 shadow-sm" aria-label={`Adjust start date for ${item.rowLabel}`} /><button type="button" onPointerDown={(event) => onResizeStart(event, item, "end", rowRef.current)} className="absolute right-1 top-1/2 h-7 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white/80 bg-white/90 shadow-sm" aria-label={`Adjust end date for ${item.rowLabel}`} /></> : null}
      </div>}
    </div> : null}
  </div>;
}
