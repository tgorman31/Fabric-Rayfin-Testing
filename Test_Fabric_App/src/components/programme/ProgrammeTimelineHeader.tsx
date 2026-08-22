import { useMemo } from "react";
import {
  buildTimelineSegments,
  getTimelineHeaderRows,
  TIMELINE_HEADER_ROW_HEIGHT,
  type TimelineRange,
  type TimelineScale,
} from "@/utils/programmeTimeline";

export function ProgrammeTimelineHeader({ range, scale, dayWidth }: { range: TimelineRange; scale: TimelineScale; dayWidth: number }) {
  const rows = useMemo(() => getTimelineHeaderRows(scale), [scale]);
  return <div className="border-l border-slate-200" style={{ width: range.totalDays * dayWidth }}>
    {rows.map((row, rowIndex) => {
      const segments = buildTimelineSegments(range, row.scale);
      const toneClass = row.tone === "top" ? "bg-slate-100 text-[11px] tracking-[0.22em]" : row.tone === "mid" ? "bg-slate-50 text-[11px] tracking-[0.2em]" : "bg-white text-xs tracking-[0.18em]";
      return <div key={`${row.scale}-${rowIndex}`} className="flex border-b border-slate-200">
        {segments.map((segment, segmentIndex) => <div key={segment.key} className={`flex items-center justify-center border-l border-slate-200 px-2 font-semibold uppercase whitespace-nowrap text-slate-500 first:border-l-0 ${toneClass} ${row.tone === "bottom" && segmentIndex % 2 === 0 ? "bg-slate-50" : ""}`} style={{ width: segment.spanDays * dayWidth, height: TIMELINE_HEADER_ROW_HEIGHT }}>{segment.label}</div>)}
      </div>;
    })}
  </div>;
}
