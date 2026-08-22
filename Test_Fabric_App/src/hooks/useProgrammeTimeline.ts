import { useEffect, useState } from "react";
import type { PointerEvent } from "react";
import {
  addDays, clamp, clampDate, dateFromInput, formatDateInput, getDaysDiff,
  getTimelineSnapDate, snapTimelineMoveDate, TIMELINE_ZOOM_STEPS,
  type ProgrammeTimelineItem, type TimelineRange, type TimelineScale,
} from "@/utils/programmeTimeline";

type DragState = { itemId: string; mode: "resize" | "move"; edge?: "start" | "end"; rowLeft: number; dayWidth: number; grabOffsetDays?: number; durationDays?: number };

type Options<T extends ProgrammeTimelineItem> = {
  items: T[];
  range: TimelineRange;
  onItemsChange: (items: T[]) => void;
  onCommit: (item: T) => void;
};

export function useProgrammeTimeline<T extends ProgrammeTimelineItem>({ items, range, onItemsChange, onCommit }: Options<T>) {
  const [zoomIndex, setZoomIndex] = useState(5);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const step = TIMELINE_ZOOM_STEPS[zoomIndex];

  useEffect(() => {
    if (!dragState) return;
    const state = dragState;
    const update = (clientX: number) => {
      const pointerDayIndex = clamp(Math.round((clientX - state.rowLeft) / state.dayWidth), 0, Math.max(0, range.totalDays - 1));
      onItemsChange(items.map((item) => {
        if (item.id !== state.itemId) return item;
        const startSource = dateFromInput(item.startDate) ?? dateFromInput(item.endDate);
        const endSource = dateFromInput(item.endDate) ?? dateFromInput(item.startDate);
        if (!startSource || !endSource) return item;
        if (state.mode === "move") {
          const durationDays = state.durationDays ?? Math.max(0, getDaysDiff(startSource, endSource));
          const rawStartIndex = clamp(pointerDayIndex - (state.grabOffsetDays ?? 0), 0, Math.max(0, range.totalDays - durationDays - 1));
          const snappedStart = snapTimelineMoveDate(addDays(range.start, rawStartIndex), step.scale);
          const maxStart = addDays(range.end, -durationDays);
          const start = clampDate(snappedStart, range.start, maxStart < range.start ? range.start : maxStart);
          return { ...item, startDate: formatDateInput(start), endDate: formatDateInput(addDays(start, durationDays)) };
        }
        const next = formatDateInput(clampDate(getTimelineSnapDate(addDays(range.start, pointerDayIndex), step.scale, state.edge ?? "start"), range.start, range.end));
        const startDate = item.startDate || item.endDate;
        const endDate = item.endDate || item.startDate;
        if (state.edge === "start") return { ...item, startDate: next, endDate: endDate && next > endDate ? next : endDate };
        return { ...item, startDate: startDate && next < startDate ? next : startDate, endDate: next };
      }));
    };
    const handleMove = (event: globalThis.PointerEvent) => { event.preventDefault(); update(event.clientX); };
    const handleUp = () => { const item = items.find((candidate) => candidate.id === state.itemId); if (item) onCommit(item); setDragState(null); };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  }, [dragState, items, onCommit, onItemsChange, range, step.scale]);

  function beginResize(event: PointerEvent<HTMLButtonElement>, item: T, edge: "start" | "end", rowElement: HTMLDivElement | null) {
    if (!item.isEditable || !rowElement || range.totalDays === 0) return;
    event.preventDefault(); event.stopPropagation();
    const rect = rowElement.getBoundingClientRect();
    setDragState({ itemId: item.id, mode: "resize", edge, rowLeft: rect.left, dayWidth: rect.width / range.totalDays });
  }

  function beginMove(event: PointerEvent<HTMLDivElement>, item: T, rowElement: HTMLDivElement | null, dayWidth: number) {
    if (!item.isEditable || !rowElement || range.totalDays === 0) return;
    const start = dateFromInput(item.startDate) ?? dateFromInput(item.endDate);
    const end = dateFromInput(item.endDate) ?? dateFromInput(item.startDate);
    if (!start || !end) return;
    event.preventDefault(); event.stopPropagation();
    const rect = rowElement.getBoundingClientRect();
    const pointerDayIndex = clamp(Math.round((event.clientX - rect.left) / dayWidth), 0, Math.max(0, range.totalDays - 1));
    const itemStartIndex = clamp(getDaysDiff(range.start, start), 0, Math.max(0, range.totalDays - 1));
    const durationDays = Math.max(0, getDaysDiff(start, end));
    setDragState({ itemId: item.id, mode: "move", rowLeft: rect.left, dayWidth, grabOffsetDays: clamp(pointerDayIndex - itemStartIndex, 0, durationDays), durationDays });
  }

  return { zoomIndex, setZoomIndex, timelineScale: step.scale as TimelineScale, timelineDayWidth: step.dayWidth, beginResize, beginMove };
}
