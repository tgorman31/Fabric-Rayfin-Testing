export type ProgrammeArea = "reporting" | "target";
export type ProgrammeRowType =
  | "activity"
  | "milestone"
  | "summary"
  | "reporting_reference";
export type DependencyType = "FS";
export type SuccessorField = "target_start" | "target_end";
export type ReportingField = "reporting_start" | "reporting_end";
export type TargetField = "target_start" | "target_end";

export type ProgrammeRuleDefinition = {
  guid: string;
  programmeArea: ProgrammeArea;
  rowType: ProgrammeRowType;
};

export type ProgrammeDateRecord = {
  programmeItemDefinitionGuid: string;
  targetStart?: Date;
  targetEnd?: Date;
  reportingStart?: Date;
  reportingEnd?: Date;
};

export type SummaryMembership = {
  guid: string;
  summaryItemDefinitionGuid: string;
  childItemDefinitionGuid: string;
  sortOrder: number;
  isActive: boolean;
};

export type DependencyDefinition = {
  guid: string;
  predecessorItemDefinitionGuid: string;
  successorItemDefinitionGuid: string;
  dependencyType: string;
  lagDays: number;
  successorField: string;
  isActive: boolean;
};

export type ReportingMapping = {
  guid: string;
  reportingItemDefinitionGuid: string;
  reportingField: string;
  targetItemDefinitionGuid: string;
  targetField: string;
  reportingReferenceItemDefinitionGuid?: string;
};

export type TargetSummaryDates = {
  targetStart?: Date;
  targetEnd?: Date;
};

export type TargetProgrammeEvaluation = {
  effectiveRecords: ProgrammeDateRecord[];
  summaryDates: Map<string, TargetSummaryDates>;
};

export type ReportingMappingResolution = {
  reportingDefinition: ProgrammeRuleDefinition;
  reportingField: ReportingField;
  reportingValue?: Date;
  targetDefinition: ProgrammeRuleDefinition;
  targetField: TargetField;
  targetValue?: Date;
  reportingReferenceDefinition?: ProgrammeRuleDefinition;
};

function definitionMap(
  definitions: ProgrammeRuleDefinition[],
): Map<string, ProgrammeRuleDefinition> {
  return new Map(definitions.map((definition) => [definition.guid, definition]));
}

function activeSummaryMembers(
  definitions: ProgrammeRuleDefinition[],
  memberships: SummaryMembership[],
): SummaryMembership[] {
  const byGuid = definitionMap(definitions);
  const active = memberships.filter((membership) => membership.isActive);

  for (const membership of active) {
    const parent = byGuid.get(membership.summaryItemDefinitionGuid);
    const child = byGuid.get(membership.childItemDefinitionGuid);
    if (!parent) {
      throw new Error(
        `Summary parent definition does not exist: ${membership.summaryItemDefinitionGuid}`,
      );
    }
    if (parent.rowType !== "summary") {
      throw new Error(`Summary parent must have row_type summary: ${parent.guid}`);
    }
    if (!child) {
      throw new Error(
        `Summary child definition does not exist: ${membership.childItemDefinitionGuid}`,
      );
    }
    if (parent.guid === child.guid) {
      throw new Error(`Direct summary self-membership is not allowed: ${parent.guid}`);
    }
  }

  const edges = new Map<string, string[]>();
  for (const membership of active) {
    const children = edges.get(membership.summaryItemDefinitionGuid) ?? [];
    children.push(membership.childItemDefinitionGuid);
    edges.set(membership.summaryItemDefinitionGuid, children);
  }
  assertAcyclic(edges, "Summary membership cycle detected");
  return active;
}

function assertAcyclic(edges: Map<string, string[]>, message: string): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string): void {
    if (visiting.has(node)) throw new Error(message);
    if (visited.has(node)) return;
    visiting.add(node);
    for (const child of edges.get(node) ?? []) visit(child);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of edges.keys()) visit(node);
}

export function validateSummaryMemberships(
  definitions: ProgrammeRuleDefinition[],
  memberships: SummaryMembership[],
): void {
  activeSummaryMembers(definitions, memberships);
}

function validateDependencies(
  definitions: ProgrammeRuleDefinition[],
  dependencies: DependencyDefinition[],
): DependencyDefinition[] {
  const byGuid = definitionMap(definitions);
  const active = dependencies.filter((dependency) => dependency.isActive);
  const controllers = new Set<string>();
  const edges = new Map<string, string[]>();

  for (const dependency of active) {
    if (dependency.dependencyType !== "FS") {
      throw new Error(`Unsupported dependency type: ${dependency.dependencyType}`);
    }
    const predecessor = byGuid.get(dependency.predecessorItemDefinitionGuid);
    const successor = byGuid.get(dependency.successorItemDefinitionGuid);
    if (!predecessor || !successor) {
      throw new Error(`Dependency endpoints must reference existing definitions: ${dependency.guid}`);
    }
    if (predecessor.programmeArea !== "target" || successor.programmeArea !== "target") {
      throw new Error(`Dependency endpoints must belong to the target programme: ${dependency.guid}`);
    }
    if (
      !["activity", "milestone"].includes(predecessor.rowType) ||
      !["activity", "milestone"].includes(successor.rowType)
    ) {
      throw new Error(`Dependency endpoints must be activities or milestones: ${dependency.guid}`);
    }
    if (predecessor.guid === successor.guid) {
      throw new Error(`A dependency cannot point to itself: ${dependency.guid}`);
    }
    if (dependency.successorField !== "target_start" && dependency.successorField !== "target_end") {
      throw new Error(`Unsupported dependency successor field: ${dependency.successorField}`);
    }
    if (dependency.successorField === "target_start" && successor.rowType !== "activity") {
      throw new Error(`target_start dependencies require an activity successor: ${dependency.guid}`);
    }
    const controllerKey = `${successor.guid}:${dependency.successorField}`;
    if (controllers.has(controllerKey)) {
      throw new Error(`Multiple active dependencies control ${controllerKey}`);
    }
    controllers.add(controllerKey);
    const successors = edges.get(predecessor.guid) ?? [];
    successors.push(successor.guid);
    edges.set(predecessor.guid, successors);
  }

  assertAcyclic(edges, "Dependency cycle detected");
  return active;
}

export function validateProgrammeDependencies(
  definitions: ProgrammeRuleDefinition[],
  dependencies: DependencyDefinition[],
): void {
  validateDependencies(definitions, dependencies);
}

function dependencyOrder(
  definitions: ProgrammeRuleDefinition[],
  dependencies: DependencyDefinition[],
): string[] {
  const indegree = new Map(definitions.map((definition) => [definition.guid, 0]));
  const outgoing = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const successors = outgoing.get(dependency.predecessorItemDefinitionGuid) ?? [];
    successors.push(dependency.successorItemDefinitionGuid);
    outgoing.set(dependency.predecessorItemDefinitionGuid, successors);
    indegree.set(
      dependency.successorItemDefinitionGuid,
      (indegree.get(dependency.successorItemDefinitionGuid) ?? 0) + 1,
    );
  }

  const queue = [...indegree.entries()]
    .filter(([, count]) => count === 0)
    .map(([guid]) => guid);
  const order: string[] = [];
  while (queue.length > 0) {
    const guid = queue.shift() as string;
    order.push(guid);
    for (const successor of outgoing.get(guid) ?? []) {
      const count = (indegree.get(successor) ?? 0) - 1;
      indegree.set(successor, count);
      if (count === 0) queue.push(successor);
    }
  }
  return order;
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function calendarDayDifference(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000));
}

export function evaluateTargetDependencies(
  definitions: ProgrammeRuleDefinition[],
  records: ProgrammeDateRecord[],
  dependencies: DependencyDefinition[],
): ProgrammeDateRecord[] {
  const validDependencies = validateDependencies(definitions, dependencies);
  const effectiveRecords = records.map((record) => ({ ...record }));
  const byDefinition = new Map(
    effectiveRecords.map((record) => [record.programmeItemDefinitionGuid, record]),
  );
  const originalByDefinition = new Map(
    records.map((record) => [record.programmeItemDefinitionGuid, record]),
  );
  const endControllers = new Set(
    validDependencies
      .filter((dependency) => dependency.successorField === "target_end")
      .map((dependency) => dependency.successorItemDefinitionGuid),
  );
  const byPredecessor = new Map<string, DependencyDefinition[]>();
  for (const dependency of validDependencies) {
    const edges = byPredecessor.get(dependency.predecessorItemDefinitionGuid) ?? [];
    edges.push(dependency);
    byPredecessor.set(dependency.predecessorItemDefinitionGuid, edges);
  }

  for (const predecessorGuid of dependencyOrder(definitions, validDependencies)) {
    const predecessor = byDefinition.get(predecessorGuid);
    if (!predecessor?.targetEnd) continue;
    for (const dependency of byPredecessor.get(predecessorGuid) ?? []) {
      const successor = byDefinition.get(dependency.successorItemDefinitionGuid);
      if (!successor) continue;
      const derivedDate = addCalendarDays(predecessor.targetEnd, dependency.lagDays);
      if (dependency.successorField === "target_end") {
        successor.targetEnd = derivedDate;
        continue;
      }

      const original = originalByDefinition.get(successor.programmeItemDefinitionGuid);
      successor.targetStart = derivedDate;
      if (
        original?.targetStart &&
        original.targetEnd &&
        !endControllers.has(successor.programmeItemDefinitionGuid)
      ) {
        successor.targetEnd = addCalendarDays(
          derivedDate,
          calendarDayDifference(original.targetStart, original.targetEnd),
        );
      }
    }
  }

  return effectiveRecords;
}

export function deriveTargetSummaryDates(
  definitions: ProgrammeRuleDefinition[],
  records: ProgrammeDateRecord[],
  memberships: SummaryMembership[],
): Map<string, TargetSummaryDates> {
  const activeMembers = activeSummaryMembers(definitions, memberships);
  const byDefinition = definitionMap(definitions);
  const recordsByDefinition = new Map(
    records.map((record) => [record.programmeItemDefinitionGuid, record]),
  );
  const membersByParent = new Map<string, SummaryMembership[]>();
  for (const member of activeMembers) {
    const children = membersByParent.get(member.summaryItemDefinitionGuid) ?? [];
    children.push(member);
    membersByParent.set(member.summaryItemDefinitionGuid, children);
  }
  const result = new Map<string, TargetSummaryDates>();
  const visiting = new Set<string>();

  function derive(summaryGuid: string): TargetSummaryDates {
    const existing = result.get(summaryGuid);
    if (existing) return existing;
    if (visiting.has(summaryGuid)) throw new Error("Summary membership cycle detected");
    visiting.add(summaryGuid);
    let targetStart: Date | undefined;
    let targetEnd: Date | undefined;
    for (const member of membersByParent.get(summaryGuid) ?? []) {
      const childDefinition = byDefinition.get(member.childItemDefinitionGuid);
      if (!childDefinition) continue;
      const childDates = childDefinition.rowType === "summary"
        ? derive(childDefinition.guid)
        : recordsByDefinition.get(childDefinition.guid);
      const childStart = childDefinition.rowType === "milestone"
        ? undefined
        : childDates?.targetStart;
      if (childStart && (!targetStart || childStart < targetStart)) {
        targetStart = childStart;
      }
      if (childDates?.targetEnd && (!targetEnd || childDates.targetEnd > targetEnd)) {
        targetEnd = childDates.targetEnd;
      }
    }
    visiting.delete(summaryGuid);
    const dates = { targetStart, targetEnd };
    result.set(summaryGuid, dates);
    return dates;
  }

  for (const definition of definitions) {
    if (definition.rowType === "summary") derive(definition.guid);
  }
  return result;
}

export function evaluateTargetProgramme(
  definitions: ProgrammeRuleDefinition[],
  records: ProgrammeDateRecord[],
  dependencies: DependencyDefinition[],
  memberships: SummaryMembership[],
): TargetProgrammeEvaluation {
  const effectiveRecords = evaluateTargetDependencies(definitions, records, dependencies);
  return {
    effectiveRecords,
    summaryDates: deriveTargetSummaryDates(definitions, effectiveRecords, memberships),
  };
}

function getReportingValue(record: ProgrammeDateRecord | undefined, field: ReportingField): Date | undefined {
  return field === "reporting_start" ? record?.reportingStart : record?.reportingEnd;
}

function getTargetValue(record: ProgrammeDateRecord | undefined, field: TargetField): Date | undefined {
  return field === "target_start" ? record?.targetStart : record?.targetEnd;
}

export function resolveReportingMappings(
  definitions: ProgrammeRuleDefinition[],
  records: ProgrammeDateRecord[],
  mappings: ReportingMapping[],
  effectiveTargetRecords: ProgrammeDateRecord[] = records,
): ReportingMappingResolution[] {
  const byGuid = definitionMap(definitions);
  const recordsByDefinition = new Map(records.map((record) => [record.programmeItemDefinitionGuid, record]));
  const effectiveByDefinition = new Map(effectiveTargetRecords.map((record) => [record.programmeItemDefinitionGuid, record]));

  return mappings.map((mapping) => {
    if (mapping.reportingField !== "reporting_start" && mapping.reportingField !== "reporting_end") {
      throw new Error(`Unsupported reporting mapping field: ${mapping.reportingField}`);
    }
    if (mapping.targetField !== "target_start" && mapping.targetField !== "target_end") {
      throw new Error(`Unsupported target mapping field: ${mapping.targetField}`);
    }
    const reportingDefinition = byGuid.get(mapping.reportingItemDefinitionGuid);
    const targetDefinition = byGuid.get(mapping.targetItemDefinitionGuid);
    if (!reportingDefinition || reportingDefinition.programmeArea !== "reporting") {
      throw new Error(`Mapping reporting definition must belong to reporting: ${mapping.guid}`);
    }
    if (!targetDefinition || targetDefinition.programmeArea !== "target") {
      throw new Error(`Mapping target definition must belong to target: ${mapping.guid}`);
    }
    if (!["activity", "milestone"].includes(targetDefinition.rowType)) {
      throw new Error(`Mapping target must be an activity or milestone: ${mapping.guid}`);
    }
    if (mapping.targetField === "target_start" && targetDefinition.rowType === "milestone") {
      throw new Error(`Milestones cannot provide target_start mappings: ${mapping.guid}`);
    }
    const referenceDefinition = mapping.reportingReferenceItemDefinitionGuid
      ? byGuid.get(mapping.reportingReferenceItemDefinitionGuid)
      : undefined;
    if (
      mapping.reportingReferenceItemDefinitionGuid &&
      (!referenceDefinition || referenceDefinition.programmeArea !== "target" || referenceDefinition.rowType !== "reporting_reference")
    ) {
      throw new Error(`Mapping reference must be a target reporting_reference: ${mapping.guid}`);
    }

    return {
      reportingDefinition,
      reportingField: mapping.reportingField,
      reportingValue: getReportingValue(recordsByDefinition.get(reportingDefinition.guid), mapping.reportingField),
      targetDefinition,
      targetField: mapping.targetField,
      targetValue: getTargetValue(effectiveByDefinition.get(targetDefinition.guid), mapping.targetField),
      reportingReferenceDefinition: referenceDefinition,
    };
  });
}
