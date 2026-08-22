import { TIMELINE_ZOOM_STEPS } from "@/utils/programmeTimeline";

export function ProgrammeZoomControls({
  zoomIndex,
  onZoomChange,
}: {
  zoomIndex: number;
  onZoomChange: (index: number) => void;
}) {
  const step = TIMELINE_ZOOM_STEPS[zoomIndex];

  return (
    <div className="flex items-center rounded-full border border-slate-300 bg-white p-1 shadow-sm">
      <button
        type="button"
        disabled={zoomIndex === 0}
        onClick={() => onZoomChange(Math.max(0, zoomIndex - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Zoom timeline out"
      >
        −
      </button>
      <div className="min-w-24 px-3 text-center">
        <div className="text-sm font-semibold text-slate-700">{step.label}</div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
          {zoomIndex + 1} / {TIMELINE_ZOOM_STEPS.length}
        </div>
      </div>
      <button
        type="button"
        disabled={zoomIndex === TIMELINE_ZOOM_STEPS.length - 1}
        onClick={() =>
          onZoomChange(Math.min(TIMELINE_ZOOM_STEPS.length - 1, zoomIndex + 1))
        }
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Zoom timeline in"
      >
        +
      </button>
    </div>
  );
}
