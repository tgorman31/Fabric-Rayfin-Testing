import type { TargetStageState } from "./targetProgrammeStages";

export type TargetRowType = "activity" | "milestone" | "summary" | "reporting_reference";

export type TargetProjectionDefinition = {
  guid: string;
  itemCode: string;
  rowLabel: string;
  rowType: TargetRowType;
  sortOrder: number;
  isEditable: boolean;
};

export type TargetProgrammeStageRow = {
  id: string;
  definitionGuid: string;
  itemCode: string;
  rowLabel: string;
  rowType: TargetRowType;
  sortOrder: number;
  startDate: string;
  endDate: string;
  isStartEditable: boolean;
  isEndEditable: boolean;
  isMoveEditable: boolean;
  source: "target" | "summary" | "reporting_reference";
};

export type TargetProjectionInput = {
  definition: TargetProjectionDefinition;
  recordId?: string;
  targetStart?: Date;
  targetEnd?: Date;
  summaryStart?: Date;
  summaryEnd?: Date;
  reportingReferenceStart?: Date;
  reportingReferenceEnd?: Date;
  startControlled: boolean;
  endControlled: boolean;
  stage: TargetStageState;
};

function dateKey(value: Date | undefined): string {
  if (!value) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function projectTargetProgrammeRows(inputs: readonly TargetProjectionInput[]): TargetProgrammeStageRow[] {
  return inputs.map(({ definition, recordId, targetStart, targetEnd, summaryStart, summaryEnd, reportingReferenceStart, reportingReferenceEnd, startControlled, endControlled, stage }) => {
    const operational = definition.rowType === "activity" || definition.rowType === "milestone";
    const editable = stage.isEditable && definition.isEditable && operational;
    const isSummary = definition.rowType === "summary";
    const isReference = definition.rowType === "reporting_reference";
    const targetStartValue = definition.rowType === "milestone" ? undefined : targetStart;
    return {
      id: recordId ?? definition.guid,
      definitionGuid: definition.guid,
      itemCode: definition.itemCode,
      rowLabel: definition.rowLabel,
      rowType: definition.rowType,
      sortOrder: definition.sortOrder,
      startDate: dateKey(isSummary ? summaryStart : isReference ? reportingReferenceStart : targetStartValue),
      endDate: dateKey(isSummary ? summaryEnd : isReference ? reportingReferenceEnd : targetEnd),
      isStartEditable: editable && definition.rowType === "activity" && !startControlled,
      isEndEditable: editable && !endControlled,
      isMoveEditable: editable && definition.rowType === "activity" && !startControlled && !endControlled,
      source: isSummary ? ("summary" as const) : isReference ? ("reporting_reference" as const) : ("target" as const),
    };
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.itemCode.localeCompare(right.itemCode));
}

export function buildTargetDatePatch(
  previous: Pick<TargetProgrammeStageRow, "startDate" | "endDate">,
  next: Pick<TargetProgrammeStageRow, "startDate" | "endDate">,
): { target_start?: string; target_end?: string } {
  const patch: { target_start?: string; target_end?: string } = {};
  if (previous.startDate !== next.startDate) patch.target_start = next.startDate;
  if (previous.endDate !== next.endDate) patch.target_end = next.endDate;
  return patch;
}

export function validateTargetDateWrite(input: {
  rowType: TargetRowType;
  definitionIsEditable: boolean;
  stageIsEditable: boolean;
  field: "target_start" | "target_end";
  controlled: boolean;
  value: Date | null;
  currentStart?: Date | null;
  currentEnd?: Date | null;
}): void {
  if (!input.stageIsEditable) throw new Error("Previous or unmapped Target Programme stages are read-only.");
  if (!input.definitionIsEditable) throw new Error("This Target Programme row is read-only.");
  if (input.rowType !== "activity" && input.rowType !== "milestone") throw new Error("Only activity and milestone target dates can be edited.");
  if (input.rowType === "milestone" && input.field === "target_start") throw new Error("Milestones do not support target_start.");
  if (input.controlled) throw new Error(`The ${input.field === "target_start" ? "Start" : "End"} date is dependency-controlled.`);
  const start = input.field === "target_start" ? input.value : input.currentStart;
  const end = input.field === "target_end" ? input.value : input.currentEnd;
  if (start && end && end < start) throw new Error("Target End must be on or after Target Start.");
}

export function selectSingleLogicalRecord<T>(records: readonly T[], label: string): T | undefined {
  if (records.length > 1) throw new Error(`Data integrity error: multiple ${label} records exist.`);
  return records[0];
}

export function validateTargetStageStatus(ragCode: string): void {
  if (!["", "R", "A", "G"].includes(ragCode)) throw new Error("RAG must be blank, R, A, or G.");
}

export function validateDdtcPlanningStatus(status: string): void {
  if (!["", "Not Lodged", "Lodged", "Granted"].includes(status)) {
    throw new Error("Planning Status must be blank, Not Lodged, Lodged, or Granted.");
  }
}
