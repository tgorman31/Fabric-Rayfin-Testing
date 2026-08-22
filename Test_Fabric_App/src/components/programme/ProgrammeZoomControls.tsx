import { TIMELINE_ZOOM_STEPS } from "@/utils/programmeTimeline";

export function ProgrammeZoomControls({ zoomIndex, onZoomChange }: { zoomIndex: number; onZoomChange: (index: number) => void }) {
  const step = TIMELINE_ZOOM_STEPS[zoomIndex];
  return <div className="flex items-center gap-2"><button type="button" onClick={() => onZoomChange(Math.max(0, zoomIndex - 1))} disabled={zoomIndex === 0} className="rounded-full border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" aria-label="Zoom out">−</button><span className="min-w-16 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{step.label}</span><button type="button" onClick={() => onZoomChange(Math.min(TIMELINE_ZOOM_STEPS.length - 1, zoomIndex + 1))} disabled={zoomIndex === TIMELINE_ZOOM_STEPS.length - 1} className="rounded-full border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" aria-label="Zoom in">+</button></div>;
}
