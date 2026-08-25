import { useEffect, useMemo, useState } from "react";

import { ProgrammeTimelineHeader } from "@/components/programme/ProgrammeTimelineHeader";
import { ProgrammeTimelineRow } from "@/components/programme/ProgrammeTimelineRow";
import { ProgrammeZoomControls } from "@/components/programme/ProgrammeZoomControls";
import { useProgrammeTimeline } from "@/hooks/useProgrammeTimeline";
import { buildTimelineRange, getTimelinePlacement, type ProgrammeTimelineItem } from "@/utils/programmeTimeline";
import { buildTargetDatePatch, type TargetProgrammeStageRow } from "@/domain/targetProgramme";
import { isTargetStageEditable, type TargetStageState } from "@/domain/targetProgrammeStages";
import type { TargetProgrammeStageWorkspace } from "@/services/targetProgrammeService";

type SaveState = "idle" | "saving" | "saved" | "error";
type TimelineTargetRow = TargetProgrammeStageRow & ProgrammeTimelineItem;

const themes = {
  activity: { barClass: "from-cyan-400 to-cyan-600", railClass: "bg-cyan-100" },
  milestone: { barClass: "from-cyan-400 to-cyan-600", railClass: "bg-cyan-100" },
  summary: { barClass: "from-slate-400 to-slate-600", railClass: "bg-slate-200" },
  reporting_reference: { barClass: "from-amber-400 to-amber-600", railClass: "bg-amber-100" },
} as const;

function toTimelineRow(row: TargetProgrammeStageRow): TimelineTargetRow {
  return {
    ...row,
    isEditable: row.isStartEditable || row.isEndEditable,
    isMilestone: row.rowType === "milestone" || (row.rowType === "reporting_reference" && !(row.startDate && row.endDate)),
  };
}

function statusLabel(state: SaveState): string {
  if (state === "saving") return "Saving...";
  if (state === "saved") return "Saved";
  if (state === "error") return "Save failed";
  return "";
}

export function TargetProgrammeStageWorkspace({
  workspace,
  stage,
  projectIsActive,
  saveState,
  error,
  onDatePatch,
  onStatusPatch,
  onPlanningStatus,
}: {
  workspace: TargetProgrammeStageWorkspace;
  stage: TargetStageState;
  projectIsActive: boolean;
  saveState: SaveState;
  error: string | null;
  onDatePatch: (definitionGuid: string, patch: { target_start?: string; target_end?: string }) => void;
  onStatusPatch: (patch: { ragCode?: string; ragComment?: string }) => void;
  onPlanningStatus: (value: string) => void;
}) {
  const [timelineRows, setTimelineRows] = useState<TimelineTargetRow[]>(() => workspace.rows.map(toTimelineRow));
  const [ragCommentDraft, setRagCommentDraft] = useState(workspace.stageStatus?.rag_comment ?? "");
  useEffect(() => setTimelineRows(workspace.rows.map(toTimelineRow)), [workspace.rows]);
  useEffect(() => setRagCommentDraft(workspace.stageStatus?.rag_comment ?? ""), [workspace.stageStatus?.rag_comment]);
  const range = useMemo(() => buildTimelineRange(timelineRows), [timelineRows]);
  const timeline = useProgrammeTimeline({
    items: timelineRows,
    range,
    onItemsChange: setTimelineRows,
    onCommit: (item, previous) => {
      if (!previous) return;
      const patch = buildTargetDatePatch(previous, item);
      if (Object.keys(patch).length > 0) onDatePatch(item.definitionGuid, patch);
    },
  });

  if (workspace.rows.length === 0) {
    return <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">No active DDTC programme definitions are configured.</div>;
  }

  const stageEditable = isTargetStageEditable(stage, projectIsActive);
  const leftGrid = "minmax(250px, 1fr) 150px 150px";
  return (
    <section className="mt-6 rounded-4xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Detailed Design, Tender, Contract</p><h4 className="mt-2 text-xl font-semibold text-slate-950">DDTC Programme Workspace</h4></div>
        <div className="flex items-center gap-3">{statusLabel(saveState) ? <span className={`text-sm ${saveState === "error" ? "text-red-700" : "text-slate-500"}`}>{statusLabel(saveState)}</span> : null}<ProgrammeZoomControls zoomIndex={timeline.zoomIndex} onZoomChange={timeline.setZoomIndex} /></div>
      </div>
      <div className="mb-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Planning Status<select disabled={!stageEditable} value={workspace.ddtcDetail?.planning_status_code ?? ""} onChange={(event) => onPlanningStatus(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">—</option><option>Not Lodged</option><option>Lodged</option><option>Granted</option></select></label>
        <label className="text-sm font-medium text-slate-700">RAG<select disabled={!stageEditable} value={workspace.stageStatus?.rag_code ?? ""} onChange={(event) => onStatusPatch({ ragCode: event.target.value })} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">—</option><option>R</option><option>A</option><option>G</option></select></label>
        <label className="text-sm font-medium text-slate-700">RAG Comment<textarea disabled={!stageEditable} value={ragCommentDraft} onChange={(event) => setRagCommentDraft(event.target.value)} onBlur={() => onStatusPatch({ ragComment: ragCommentDraft })} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
      </div>
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <div className="overflow-x-auto rounded-3xl border border-slate-200"><div className="min-w-[1050px]">
        <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: `${leftGrid} 1fr` }}><div className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" style={{ gridTemplateColumns: leftGrid }}><span>Item</span><span>Start</span><span>End</span></div><ProgrammeTimelineHeader range={range} scale={timeline.timelineScale} dayWidth={timeline.timelineDayWidth} /></div>
        {timelineRows.map((row) => { const placement = getTimelinePlacement(row, range, timeline.timelineDayWidth); const theme = themes[row.rowType]; return <div key={row.id} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: `${leftGrid} 1fr` }}><div className="grid items-center gap-2 px-4 py-3 text-sm" style={{ gridTemplateColumns: leftGrid }}><div><div className="font-medium text-slate-800">{row.rowLabel}</div><div className="text-xs text-slate-400">{row.itemCode} · {row.rowType}</div></div>{row.rowType === "milestone" || row.rowType === "reporting_reference" ? <span className="text-slate-400">{row.startDate || "—"}</span> : <input type="date" value={row.startDate} disabled={!row.isStartEditable} onChange={(event) => onDatePatch(row.definitionGuid, { target_start: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400" />}<input type="date" value={row.endDate} disabled={!row.isEndEditable} onChange={(event) => onDatePatch(row.definitionGuid, { target_end: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400" /></div><ProgrammeTimelineRow item={row} range={range} scale={timeline.timelineScale} dayWidth={timeline.timelineDayWidth} placement={placement} theme={theme} onResizeStart={timeline.beginResize} onMoveStart={timeline.beginMove} /></div>; })}
      </div></div>
    </section>
  );
}
