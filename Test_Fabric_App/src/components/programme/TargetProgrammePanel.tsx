import { useMemo, useState } from "react";

import { TargetProgrammeStageWorkspace } from "@/components/programme/TargetProgrammeStageWorkspace";

import {
  buildTargetStageStates,
  resolveTargetStageCode,
  TARGET_PROGRAMME_STAGES,
  type TargetStageCode,
  type TargetStageState,
} from "@/domain/targetProgrammeStages";

function positionLabel(stage: TargetStageState): string {
  switch (stage.position) {
    case "previous":
      return "Read-only";
    case "current":
      return "Current · Editable";
    case "future":
      return "Forward planning · Editable";
    default:
      return "Read-only · Unmapped";
  }
}

function positionClasses(stage: TargetStageState): string {
  if (stage.position === "current") {
    return "border-[#025437] bg-[#f1faf4] text-[#025437] shadow-sm";
  }
  if (stage.position === "unmapped") {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }
  return "border-slate-200 bg-white text-slate-700 hover:border-[#8fb73e] hover:bg-[#f7fbf8]";
}

export function TargetProgrammePanel({ projectGuid, reportingStage }: { projectGuid: string; reportingStage: string }) {
  const stages = useMemo(
    () => buildTargetStageStates(reportingStage),
    [reportingStage],
  );
  const mappedStage = resolveTargetStageCode(reportingStage);
  const [selectedStageCode, setSelectedStageCode] = useState<TargetStageCode>(
    () => mappedStage ?? TARGET_PROGRAMME_STAGES[0].code,
  );
  const selectedStage = stages.find((stage) => stage.code === selectedStageCode) ?? stages[0];

  return (
    <section className="rounded-4xl border border-white/70 bg-white p-7 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Target Programme</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Select a programme stage to view its workspace. Programme content will be added in a subsequent implementation slice.
          </p>
        </div>
        {!mappedStage ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Reporting Stage has no Target Programme mapping. All stages are read-only.
          </div>
        ) : null}
      </div>

      <nav aria-label="Target Programme stages" className="grid gap-3 md:grid-cols-5">
        {stages.map((stage) => (
          <button
            key={stage.code}
            type="button"
            onClick={() => setSelectedStageCode(stage.code)}
            className={`rounded-3xl border px-4 py-4 text-left transition ${positionClasses(stage)} ${selectedStage.code === stage.code ? "ring-2 ring-[#8fb73e]/50" : ""}`}
            aria-pressed={selectedStage.code === stage.code}
          >
            <span className="block text-sm font-semibold">{stage.label}</span>
            <span className="mt-2 block text-xs font-medium uppercase tracking-[0.12em] opacity-75">
              {positionLabel(stage)}
            </span>
          </button>
        ))}
      </nav>

      {selectedStage.code === "ddtc" ? (
        <TargetProgrammeStageWorkspace
          key={`${projectGuid}-${reportingStage}-${selectedStage.code}`}
          projectGuid={projectGuid}
          reportingStage={reportingStage}
          stage={selectedStage}
        />
      ) : null}
      {selectedStage.code !== "ddtc" ? <div className="mt-6 rounded-4xl border border-slate-200 bg-slate-50/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected stage</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">{selectedStage.label}</h4>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedStage.isEditable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
            {selectedStage.isEditable ? "Editable" : "Read-only"}
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {selectedStage.position === "unmapped"
            ? "This stage is available for viewing only until Reporting Stage is mapped."
            : "The stage workspace is ready for programme content in a subsequent implementation slice."}
        </p>
      </div> : null}
    </section>
  );
}
