import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/AuthContext";
import {
  type HistorySortMode,
  getProjectHistory,
  type ProjectHistoryNode,
  type ProjectHistoryResult,
} from "@/services/projectHistoryService";
import {
  createProject,
  splitForContracts,
  splitForNewPlanningApplication,
} from "@/services/projectService";

const SITE_CODE_PATTERN = /^[A-Z]{1,2}\d{3}$/;
const SPLIT_PROJECT_REF_PATTERN = /^[A-Z]{1,2}\d{3}-\d{2}(?:-\d{2})?$/;

type ActiveTab = "create" | "split" | "history";
type SplitType = "planning" | "contracts";

type TreeNodeProps = {
  node: ProjectHistoryNode;
  childMap: Map<string, ProjectHistoryNode[]>;
  matchedGuids: Set<string>;
  selectedGuid: string | null;
  ancestorGuids: Set<string>;
  onSelect: (guid: string) => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete request.";
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStatusTone(isActive: boolean): string {
  return isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700";
}

function getReasonTone(
  reason: ProjectHistoryNode["inferredSplitReason"],
): string {
  return reason === "contract"
    ? "bg-purple-100 text-purple-800"
    : "bg-amber-100 text-amber-800";
}

function sortHistoryNodes(nodes: ProjectHistoryNode[]): ProjectHistoryNode[] {
  return [...nodes].sort((left, right) => {
    const byFrom = left.effectiveFrom.getTime() - right.effectiveFrom.getTime();

    if (byFrom !== 0) {
      return byFrom;
    }

    const byTo = left.effectiveTo.getTime() - right.effectiveTo.getTime();

    if (byTo !== 0) {
      return byTo;
    }

    return left.projectRef.localeCompare(right.projectRef);
  });
}

function buildChildMap(
  nodes: ProjectHistoryNode[],
): Map<string, ProjectHistoryNode[]> {
  const map = new Map<string, ProjectHistoryNode[]>();

  for (const node of nodes) {
    if (!node.parentGuid) {
      continue;
    }

    const children = map.get(node.parentGuid) ?? [];
    children.push(node);
    map.set(node.parentGuid, children);
  }

  for (const [guid, children] of map.entries()) {
    map.set(guid, sortHistoryNodes(children));
  }

  return map;
}

function buildNodeMap(
  nodes: ProjectHistoryNode[],
): Map<string, ProjectHistoryNode> {
  return new Map(nodes.map((node) => [node.guid, node]));
}

function getRootNodes(nodes: ProjectHistoryNode[]): ProjectHistoryNode[] {
  const nodeMap = buildNodeMap(nodes);

  return sortHistoryNodes(
    nodes.filter((node) => !node.parentGuid || !nodeMap.has(node.parentGuid)),
  );
}

function collectAncestorGuids(
  selectedGuid: string | null,
  nodeMap: Map<string, ProjectHistoryNode>,
): Set<string> {
  const ancestors = new Set<string>();

  if (!selectedGuid) {
    return ancestors;
  }

  let current = nodeMap.get(selectedGuid) ?? null;

  while (current?.parentGuid) {
    ancestors.add(current.parentGuid);
    current = nodeMap.get(current.parentGuid) ?? null;
  }

  return ancestors;
}

function flattenTreeNodes(
  roots: ProjectHistoryNode[],
  childMap: Map<string, ProjectHistoryNode[]>,
): ProjectHistoryNode[] {
  const flattened: ProjectHistoryNode[] = [];

  function visit(node: ProjectHistoryNode) {
    flattened.push(node);

    for (const child of childMap.get(node.guid) ?? []) {
      visit(child);
    }
  }

  for (const root of roots) {
    visit(root);
  }

  return flattened;
}

function HistoryTreeNode({
  node,
  childMap,
  matchedGuids,
  selectedGuid,
  ancestorGuids,
  onSelect,
}: TreeNodeProps) {
  const children = childMap.get(node.guid) ?? [];
  const isSelected = node.guid === selectedGuid;
  const isMatched = matchedGuids.has(node.guid);
  const isAncestor = ancestorGuids.has(node.guid);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.guid)}
        className={`w-full rounded-xl border p-4 text-left transition ${
          isSelected
            ? "border-blue-600 bg-blue-50 shadow-sm"
            : isMatched
              ? "border-blue-300 bg-blue-50/60"
              : isAncestor
                ? "border-sky-300 bg-sky-50/50"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-950">
                {node.projectRef}
              </h4>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                  node.isActive,
                )}`}
              >
                {node.isActive ? "Active" : "Historical"}
              </span>
              {node.inferredSplitReason && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getReasonTone(
                    node.inferredSplitReason,
                  )}`}
                >
                  {node.inferredSplitReason}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {formatDate(node.effectiveFrom)} → {formatDate(node.effectiveTo)}
            </p>
          </div>
          {isMatched && (
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
              Match
            </span>
          )}
        </div>
      </button>

      {children.length > 0 && (
        <ul className="ml-6 mt-4 space-y-4 border-l border-gray-200 pl-6">
          {children.map((child) => (
            <HistoryTreeNode
              key={child.guid}
              node={child}
              childMap={childMap}
              matchedGuids={matchedGuids}
              selectedGuid={selectedGuid}
              ancestorGuids={ancestorGuids}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function HomePage() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");
  const [siteCode, setSiteCode] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("planning");
  const [totalContractSplits, setTotalContractSplits] = useState("2");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyResult, setHistoryResult] =
    useState<ProjectHistoryResult | null>(null);
  const [selectedHistoryGuid, setSelectedHistoryGuid] = useState<string | null>(
    null,
  );
  const [historySortMode, setHistorySortMode] =
    useState<HistorySortMode>("tree");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalisedSiteCode = useMemo(
    () => siteCode.trim().toUpperCase(),
    [siteCode],
  );
  const normalisedProjectRef = useMemo(
    () => projectRef.trim().toUpperCase(),
    [projectRef],
  );
  const normalisedHistoryQuery = useMemo(
    () => historyQuery.trim().toUpperCase(),
    [historyQuery],
  );
  const siteCodeIsValid = SITE_CODE_PATTERN.test(normalisedSiteCode);
  const projectRefIsValid =
    SPLIT_PROJECT_REF_PATTERN.test(normalisedProjectRef);
  const contractSplitCount = Number(totalContractSplits);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!siteCodeIsValid) {
      setError(
        "Enter 1 or 2 letters followed by 3 numbers, e.g. D012 or KK123.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const project = await createProject(normalisedSiteCode);
      setSiteCode("");
      setSuccessMessage(`Project ${project.projectRef} created successfully.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSplitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!projectRefIsValid) {
      setError(
        "Enter a project reference like D012-01, KK123-01, or an existing contract ref like D012-01-01.",
      );
      return;
    }

    if (
      splitType === "contracts" &&
      (!Number.isInteger(contractSplitCount) ||
        contractSplitCount < 2 ||
        contractSplitCount > 99)
    ) {
      setError("Enter a total contract split count between 2 and 99.");
      return;
    }

    setSubmitting(true);

    try {
      if (splitType === "planning") {
        const result =
          await splitForNewPlanningApplication(normalisedProjectRef);
        setProjectRef("");
        setSuccessMessage(
          `Project ref ${result.sourceProjectRef} has been split into ${result.createdProjectRefs.join(
            " and ",
          )}.`,
        );
      } else {
        const result = await splitForContracts(
          normalisedProjectRef,
          contractSplitCount,
        );
        const allContractRefs = Array.from(
          new Set([
            ...result.existingProjectRefs,
            ...result.createdProjectRefs,
          ]),
        ).sort();

        setProjectRef("");
        setSuccessMessage(
          `Project ref ${result.sourceProjectRef} has been split into ${allContractRefs.join(
            ", ",
          )}.`,
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHistorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!normalisedHistoryQuery) {
      setError(
        "Enter a site code like D012 or a project reference like D012-01.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await getProjectHistory(normalisedHistoryQuery);
      setHistoryResult(result);
      setSelectedHistoryGuid(result.defaultSelectedGuid);
    } catch (err) {
      setHistoryResult(null);
      setSelectedHistoryGuid(null);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const historyNodes = useMemo(
    () => historyResult?.nodes ?? [],
    [historyResult],
  );
  const historyNodeMap = useMemo(
    () => buildNodeMap(historyNodes),
    [historyNodes],
  );
  const historyChildMap = useMemo(
    () => buildChildMap(historyNodes),
    [historyNodes],
  );
  const historyRoots = useMemo(
    () => getRootNodes(historyNodes),
    [historyNodes],
  );
  const matchedHistoryGuids = useMemo(
    () => new Set(historyResult?.matchedGuids ?? []),
    [historyResult],
  );
  const ancestorHistoryGuids = useMemo(
    () => collectAncestorGuids(selectedHistoryGuid, historyNodeMap),
    [selectedHistoryGuid, historyNodeMap],
  );
  const selectedHistoryNode = selectedHistoryGuid
    ? (historyNodeMap.get(selectedHistoryGuid) ?? null)
    : null;
  const chronologicalHistoryNodes = useMemo(
    () => sortHistoryNodes(historyNodes),
    [historyNodes],
  );
  const treeOrderedHistoryNodes = useMemo(
    () => flattenTreeNodes(historyRoots, historyChildMap),
    [historyRoots, historyChildMap],
  );
  const historyTableRows =
    historySortMode === "chronological"
      ? chronologicalHistoryNodes
      : treeOrderedHistoryNodes;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      {successMessage && (
        <div
          role="status"
          className="fixed right-6 top-6 z-10 max-w-xl rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {successMessage}
        </div>
      )}

      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
        <div>
          <p className="text-sm font-medium text-blue-600">Fabric Rayfin</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Project Register
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden text-sm text-gray-500 sm:inline">
              Signed in as {user.email}
            </span>
          )}
          <button
            onClick={() => void signOut()}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col px-6 py-16">
        <div className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => switchTab("create")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "create"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Create Project
          </button>
          <button
            type="button"
            onClick={() => switchTab("split")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "split"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Split Project
          </button>
          <button
            type="button"
            onClick={() => switchTab("history")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Project History
          </button>
        </div>

        {activeTab === "create" ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-xl font-semibold">New project</h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter a site code to create the next project reference for that
                site.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="site-code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Site code
                </label>
                <input
                  id="site-code"
                  type="text"
                  value={siteCode}
                  onChange={(event) =>
                    setSiteCode(event.target.value.toUpperCase())
                  }
                  placeholder="D012"
                  autoComplete="off"
                  maxLength={5}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base uppercase tracking-wide shadow-sm outline-none transition placeholder:normal-case placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  aria-describedby="site-code-help create-error"
                  aria-invalid={error ? true : undefined}
                />
                <p id="site-code-help" className="mt-2 text-sm text-gray-500">
                  Use 1 or 2 letters followed by 3 numbers, for example D012 or
                  KK123.
                </p>
              </div>

              {error && (
                <p
                  id="create-error"
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !siteCode.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? "Creating project..." : "Create project"}
              </button>
            </form>
          </section>
        ) : activeTab === "split" ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-xl font-semibold">Split project</h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter an active project reference and choose how it should be
                split.
              </p>
            </div>

            <form onSubmit={handleSplitSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="project-ref"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project reference
                </label>
                <input
                  id="project-ref"
                  type="text"
                  value={projectRef}
                  onChange={(event) =>
                    setProjectRef(event.target.value.toUpperCase())
                  }
                  placeholder="D012-01"
                  autoComplete="off"
                  maxLength={20}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base uppercase tracking-wide shadow-sm outline-none transition placeholder:normal-case placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  aria-describedby="project-ref-help split-error"
                  aria-invalid={error ? true : undefined}
                />
                <p id="project-ref-help" className="mt-2 text-sm text-gray-500">
                  Use a site-level project ref such as D012-01. For contract
                  splits, you can also enter an existing contract ref such as
                  D012-01-01 to add further cumulative splits.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-gray-700">
                  Split type
                </legend>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50">
                  <input
                    type="radio"
                    name="split-type"
                    value="planning"
                    checked={splitType === "planning"}
                    onChange={() => setSplitType("planning")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      New Planning Application
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      Splits the active project into two related planning
                      branches.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50">
                  <input
                    type="radio"
                    name="split-type"
                    value="contracts"
                    checked={splitType === "contracts"}
                    onChange={() => setSplitType("contracts")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Split Contracts
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      Creates cumulative contract refs such as D012-01-01,
                      D012-01-02, and so on.
                    </span>
                  </span>
                </label>
              </fieldset>

              {splitType === "contracts" && (
                <div>
                  <label
                    htmlFor="contract-split-count"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Total contract splits
                  </label>
                  <input
                    id="contract-split-count"
                    type="number"
                    min={2}
                    max={99}
                    step={1}
                    value={totalContractSplits}
                    onChange={(event) =>
                      setTotalContractSplits(event.target.value)
                    }
                    className="mt-2 block w-40 rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the total number of contract refs required. Existing
                    refs are reused and only missing refs are created.
                  </p>
                </div>
              )}

              {error && (
                <p
                  id="split-error"
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !projectRef.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? "Splitting project..." : "Split project"}
              </button>
            </form>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-xl font-semibold">Project history</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Enter a site code or project reference to view lineage,
                  related branches, and historical versions.
                </p>
              </div>

              <form onSubmit={handleHistorySubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="history-query"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Site code or project reference
                  </label>
                  <input
                    id="history-query"
                    type="text"
                    value={historyQuery}
                    onChange={(event) =>
                      setHistoryQuery(event.target.value.toUpperCase())
                    }
                    placeholder="D012 or D012-01-01"
                    autoComplete="off"
                    maxLength={20}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base uppercase tracking-wide shadow-sm outline-none transition placeholder:normal-case placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    aria-describedby="history-query-help history-error"
                    aria-invalid={error ? true : undefined}
                  />
                  <p
                    id="history-query-help"
                    className="mt-2 text-sm text-gray-500"
                  >
                    Search by site code like D012, project ref like D012-01, or
                    contract ref like D012-01-01.
                  </p>
                </div>

                {error && (
                  <p
                    id="history-error"
                    role="alert"
                    className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !historyQuery.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitting ? "Loading history..." : "View history"}
                </button>
              </form>
            </div>

            {historyResult && (
              <>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-950">
                          Lineage tree
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Showing complete {historyResult.mode} history for{" "}
                          <span className="font-semibold text-gray-700">
                            {historyResult.query}
                          </span>
                          .
                        </p>
                      </div>
                      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Root at top
                      </div>
                    </div>

                    <ul className="space-y-6">
                      {historyRoots.map((root) => (
                        <HistoryTreeNode
                          key={root.guid}
                          node={root}
                          childMap={historyChildMap}
                          matchedGuids={matchedHistoryGuids}
                          selectedGuid={selectedHistoryGuid}
                          ancestorGuids={ancestorHistoryGuids}
                          onSelect={setSelectedHistoryGuid}
                        />
                      ))}
                    </ul>
                  </section>

                  <aside className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-950">
                      Selected node
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click a node in the tree to inspect its details.
                    </p>

                    {selectedHistoryNode ? (
                      <dl className="mt-6 space-y-4 text-sm">
                        <div>
                          <dt className="font-medium text-gray-500">
                            Project ref
                          </dt>
                          <dd className="mt-1 font-semibold text-gray-950">
                            {selectedHistoryNode.projectRef}
                          </dd>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                              selectedHistoryNode.isActive,
                            )}`}
                          >
                            {selectedHistoryNode.isActive
                              ? "Active"
                              : "Historical"}
                          </span>
                          {selectedHistoryNode.inferredSplitReason && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getReasonTone(
                                selectedHistoryNode.inferredSplitReason,
                              )}`}
                            >
                              {selectedHistoryNode.inferredSplitReason}
                            </span>
                          )}
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Effective from
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {formatDate(selectedHistoryNode.effectiveFrom)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Effective to
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {formatDate(selectedHistoryNode.effectiveTo)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">GUID</dt>
                          <dd className="mt-1 break-all text-gray-900">
                            {selectedHistoryNode.guid}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Parent GUID
                          </dt>
                          <dd className="mt-1 break-all text-gray-900">
                            {selectedHistoryNode.parentGuid ?? "None"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">
                            Root GUID
                          </dt>
                          <dd className="mt-1 break-all text-gray-900">
                            {selectedHistoryNode.rootGuid}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-6 text-sm text-gray-500">
                        No node selected yet.
                      </p>
                    )}
                  </aside>
                </div>

                <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-950">
                        Related history
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Switch between chronological order and tree/depth order.
                      </p>
                    </div>
                    <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                      <button
                        type="button"
                        onClick={() => setHistorySortMode("tree")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          historySortMode === "tree"
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 hover:bg-white hover:text-gray-900"
                        }`}
                      >
                        Tree order
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistorySortMode("chronological")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          historySortMode === "chronological"
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 hover:bg-white hover:text-gray-900"
                        }`}
                      >
                        Chronological
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="pb-3 pr-4 font-medium">Project ref</th>
                          <th className="pb-3 pr-4 font-medium">Status</th>
                          <th className="pb-3 pr-4 font-medium">Reason</th>
                          <th className="pb-3 pr-4 font-medium">
                            Effective from
                          </th>
                          <th className="pb-3 pr-4 font-medium">
                            Effective to
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {historyTableRows.map((node) => {
                          const isSelected = node.guid === selectedHistoryGuid;
                          const isMatched = matchedHistoryGuids.has(node.guid);

                          return (
                            <tr
                              key={node.guid}
                              className={`cursor-pointer transition hover:bg-gray-50 ${
                                isSelected ? "bg-blue-50" : ""
                              }`}
                              onClick={() => setSelectedHistoryGuid(node.guid)}
                            >
                              <td className="py-3 pr-4 font-medium text-gray-950">
                                <div className="flex items-center gap-2">
                                  <span>{node.projectRef}</span>
                                  {isMatched && (
                                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                      Match
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                                    node.isActive,
                                  )}`}
                                >
                                  {node.isActive ? "Active" : "Historical"}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-gray-700">
                                {node.inferredSplitReason ?? "None"}
                              </td>
                              <td className="py-3 pr-4 text-gray-700">
                                {formatDate(node.effectiveFrom)}
                              </td>
                              <td className="py-3 pr-4 text-gray-700">
                                {formatDate(node.effectiveTo)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
