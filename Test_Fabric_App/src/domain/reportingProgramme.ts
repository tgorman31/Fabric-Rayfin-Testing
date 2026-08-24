import type { ProgrammeDefinitionRecord, ProjectProgrammeRecord } from "@/services/programmeService";

export type ReportingCompatibilityDefinition = {
  guid: string;
  itemCode: string;
  stageCode: string;
  sectionLabel: string;
  rowLabel: string;
  levelCode: string;
  sortOrder: number;
  isEditable: boolean;
};

export type LegacyReportingRecord = {
  row_code: string;
  row_label?: string;
  start_date?: Date;
  end_date?: Date;
};

export type CanonicalReportingRecord = {
  programme_item_definition_guid: string;
  reporting_start?: Date;
  reporting_end?: Date;
};

export type CompatibilityDefinitionState = {
  guid: string;
  item_code: string;
  programme_area: string;
  stage_code: string;
  row_type: string;
  is_derived: boolean;
  is_active: boolean;
};

export function isCompatibleReportingDefinition(
  existing: CompatibilityDefinitionState,
  expected: ReportingCompatibilityDefinition,
): boolean {
  return existing.guid === expected.guid &&
    existing.item_code === expected.itemCode &&
    existing.programme_area === "reporting" &&
    existing.stage_code === expected.stageCode &&
    existing.row_type === "activity" &&
    !existing.is_derived;
}

export function requiresReportingMigration(
  compatibilityDefinitions: readonly Pick<ReportingCompatibilityDefinition, "guid">[],
  persistedDefinitions: readonly Pick<CompatibilityDefinitionState, "guid" | "is_active">[],
  canonicalRecords: readonly Pick<CanonicalReportingRecord, "programme_item_definition_guid">[],
): boolean {
  const canonicalGuids = new Set(canonicalRecords.map((record) => record.programme_item_definition_guid));
  const persistedByGuid = new Map(persistedDefinitions.map((definition) => [definition.guid, definition]));
  return compatibilityDefinitions.some((definition) => {
    const persisted = persistedByGuid.get(definition.guid);
    return Boolean(persisted?.is_active && !canonicalGuids.has(definition.guid));
  });
}

export type ReportingMigrationDecision = {
  definitionGuid: string;
  itemCode: string;
  reportingStart?: Date;
  reportingEnd?: Date;
  create: boolean;
};

export type CanonicalReportingView = {
  id: string;
  sectionCode: string;
  sectionLabel: string;
  rowCode: string;
  rowLabel: string;
  levelCode: string;
  isEditable: boolean;
  startDate: string;
  endDate: string;
  reportingDate: string;
  referenceRagCode: string;
  referenceRagComment: string;
};

const row = (
  guid: string,
  stageCode: string,
  sectionLabel: string,
  itemCode: string,
  rowLabel: string,
  levelCode: string,
  sortOrder: number,
  isEditable: boolean,
): ReportingCompatibilityDefinition => ({
  guid,
  itemCode,
  stageCode,
  sectionLabel,
  rowLabel,
  levelCode,
  sortOrder,
  isEditable,
});

/** Compatibility only: these are the 15 rows delivered by the legacy Reporting UI. */
export const REPORTING_COMPATIBILITY_DEFINITIONS: readonly ReportingCompatibilityDefinition[] = [
  row("61000000-0000-4000-8000-000000000001", "land-activation", "Land Activation", "la-opportunity", "Opportunity identified", "O", 1, true),
  row("61000000-0000-4000-8000-000000000002", "land-activation", "Land Activation", "la-agreement", "Heads of terms agreed", "E", 2, true),
  row("61000000-0000-4000-8000-000000000003", "land-activation", "Land Activation", "la-transfer", "Transfer to property", "B", 3, true),
  row("61000000-0000-4000-8000-000000000004", "site-pipeline", "Site Pipeline", "sp-g1", "Gateway 1", "B", 4, true),
  row("61000000-0000-4000-8000-000000000005", "site-pipeline", "Site Pipeline", "sp-g2", "Gateway 2", "E", 5, true),
  row("61000000-0000-4000-8000-000000000006", "site-pipeline", "Site Pipeline", "sp-homes", "Homes total", "O", 6, false),
  row("61000000-0000-4000-8000-000000000007", "planning", "Planning", "pl-preapp", "Pre-app engagement", "P", 7, true),
  row("61000000-0000-4000-8000-000000000008", "planning", "Planning", "pl-submit", "Planning submitted", "E", 8, true),
  row("61000000-0000-4000-8000-000000000009", "planning", "Planning", "pl-granted", "Planning granted", "B", 9, true),
  row("61000000-0000-4000-8000-000000000010", "ddtc", "Detailed Design / Tender / Contract", "ddtc-design", "Detailed design complete", "O", 10, true),
  row("61000000-0000-4000-8000-000000000011", "ddtc", "Detailed Design / Tender / Contract", "ddtc-tender", "Tender return", "E", 11, true),
  row("61000000-0000-4000-8000-000000000012", "ddtc", "Detailed Design / Tender / Contract", "ddtc-contract", "Contract award", "B", 12, true),
  row("61000000-0000-4000-8000-000000000013", "construction", "Construction", "co-start", "Start on site", "B", 13, true),
  row("61000000-0000-4000-8000-000000000014", "construction", "Construction", "co-mid", "Mid-stage delivery review", "O", 14, true),
  row("61000000-0000-4000-8000-000000000015", "construction", "Construction", "co-complete", "Completion / handover", "B", 15, true),
];

export const REPORTING_COMPATIBILITY_STAGE_ORDER = [
  "land-activation",
  "site-pipeline",
  "planning",
  "ddtc",
  "construction",
] as const;

export function dateOnlyKey(value: Date | string | undefined | null): string {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return value;
  throw new Error(`Unsupported date value: ${value}`);
}

export function parseDateOnly(value: Date | string | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a YYYY-MM-DD date, received: ${value}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function buildReportingMigrationPlan(
  compatibilityDefinitions: readonly ReportingCompatibilityDefinition[],
  legacyRows: readonly LegacyReportingRecord[],
  canonicalRecords: readonly CanonicalReportingRecord[],
): ReportingMigrationDecision[] {
  const byCode = new Map(compatibilityDefinitions.map((definition) => [definition.itemCode, definition]));
  for (const legacy of legacyRows) {
    if (!byCode.has(legacy.row_code)) {
      throw new Error(`Legacy Reporting row is not in the compatibility catalogue: ${legacy.row_code}`);
    }
  }

  const canonicalByDefinition = new Map(canonicalRecords.map((record) => [record.programme_item_definition_guid, record]));
  return compatibilityDefinitions.map((definition) => {
    const existing = canonicalByDefinition.get(definition.guid);
    if (existing) {
      return { definitionGuid: definition.guid, itemCode: definition.itemCode, create: false };
    }
    const legacy = legacyRows.find((row) => row.row_code === definition.itemCode);
    return {
      definitionGuid: definition.guid,
      itemCode: definition.itemCode,
      reportingStart: legacy?.start_date ? parseDateOnly(legacy.start_date) : undefined,
      reportingEnd: legacy?.end_date ? parseDateOnly(legacy.end_date) : undefined,
      create: true,
    };
  });
}

export function buildReportingDatePatch(
  patch: { startDate?: string; endDate?: string },
): { reporting_start?: Date | null; reporting_end?: Date | null } {
  const result: { reporting_start?: Date | null; reporting_end?: Date | null } = {};
  if (Object.prototype.hasOwnProperty.call(patch, "startDate")) {
    result.reporting_start = patch.startDate ? parseDateOnly(patch.startDate) ?? null : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "endDate")) {
    result.reporting_end = patch.endDate ? parseDateOnly(patch.endDate) ?? null : null;
  }
  return result;
}

export function sortReportingDefinitions<T extends { stage_code: string; sort_order: number; item_code: string }>(
  definitions: readonly T[],
): T[] {
  const stagePosition = new Map<string, number>(REPORTING_COMPATIBILITY_STAGE_ORDER.map((stage, index) => [stage, index]));
  return [...definitions].sort((left, right) => {
    const leftPosition = stagePosition.get(left.stage_code) ?? REPORTING_COMPATIBILITY_STAGE_ORDER.length;
    const rightPosition = stagePosition.get(right.stage_code) ?? REPORTING_COMPATIBILITY_STAGE_ORDER.length;
    if (leftPosition !== rightPosition) return leftPosition - rightPosition;
    if (leftPosition === REPORTING_COMPATIBILITY_STAGE_ORDER.length) {
      return left.stage_code.localeCompare(right.stage_code) || left.sort_order - right.sort_order || left.item_code.localeCompare(right.item_code);
    }
    return left.sort_order - right.sort_order || left.item_code.localeCompare(right.item_code);
  });
}

export function mapCanonicalReportingView(
  definition: ProgrammeDefinitionRecord,
  record: ProjectProgrammeRecord,
): CanonicalReportingView {
  return {
    id: record.id,
    sectionCode: definition.stage_code,
    sectionLabel: REPORTING_COMPATIBILITY_DEFINITIONS.find((item) => item.stageCode === definition.stage_code)?.sectionLabel ?? definition.stage_code,
    rowCode: definition.item_code,
    rowLabel: definition.row_label,
    levelCode: definition.level_code ?? "",
    isEditable: definition.is_editable,
    startDate: dateOnlyKey(record.reporting_start),
    endDate: dateOnlyKey(record.reporting_end),
    reportingDate: "",
    referenceRagCode: "",
    referenceRagComment: "",
  };
}
