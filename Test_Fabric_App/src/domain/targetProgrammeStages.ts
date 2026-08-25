export type TargetStageCode =
  | "land-activation"
  | "site-pipeline"
  | "planning"
  | "ddtc"
  | "construction";

export type TargetStagePosition = "previous" | "current" | "future" | "unmapped";

export type TargetStageDefinition = {
  code: TargetStageCode;
  label: string;
};

export type TargetStageState = TargetStageDefinition & {
  position: TargetStagePosition;
  isEditable: boolean;
};

export const TARGET_PROGRAMME_STAGES: readonly TargetStageDefinition[] = [
  { code: "land-activation", label: "Land Activation" },
  { code: "site-pipeline", label: "Site Pipeline" },
  { code: "planning", label: "Planning" },
  { code: "ddtc", label: "Detailed Design, Tender, Contract" },
  { code: "construction", label: "Construction" },
];

export const REPORTING_STAGE_OPTIONS = [
  "Land Activation",
  "Site Pipeline",
  "Planning",
  "Detailed Design / Tender / Contract",
  "Construction",
] as const;

export const REPORTING_STAGE_TO_TARGET_STAGE: Readonly<
  Record<(typeof REPORTING_STAGE_OPTIONS)[number], TargetStageCode>
> = {
  "Land Activation": "land-activation",
  "Site Pipeline": "site-pipeline",
  Planning: "planning",
  "Detailed Design / Tender / Contract": "ddtc",
  Construction: "construction",
};

export function resolveTargetStageCode(
  reportingStage: string,
): TargetStageCode | undefined {
  return REPORTING_STAGE_TO_TARGET_STAGE[
    reportingStage as keyof typeof REPORTING_STAGE_TO_TARGET_STAGE
  ];
}

export function isTargetStageEditable(stage: TargetStageState, projectIsActive: boolean): boolean {
  return projectIsActive && stage.isEditable;
}

export function buildTargetStageStates(
  reportingStage: string,
): TargetStageState[] {
  const currentCode = resolveTargetStageCode(reportingStage);
  const currentIndex = currentCode
    ? TARGET_PROGRAMME_STAGES.findIndex((stage) => stage.code === currentCode)
    : -1;

  return TARGET_PROGRAMME_STAGES.map((stage, index) => {
    if (currentIndex < 0) {
      return { ...stage, position: "unmapped", isEditable: false };
    }
    if (index < currentIndex) {
      return { ...stage, position: "previous", isEditable: false };
    }
    if (index === currentIndex) {
      return { ...stage, position: "current", isEditable: true };
    }
    return { ...stage, position: "future", isEditable: true };
  });
}
