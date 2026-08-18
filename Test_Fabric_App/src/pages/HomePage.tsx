import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/AuthContext";
import {
  createProject,
  splitForContracts,
  splitForNewPlanningApplication,
} from "@/services/projectService";

const SITE_CODE_PATTERN = /^[A-Z]{1,2}\d{3}$/;
const PROJECT_REF_PATTERN = /^[A-Z]{1,2}\d{3}-\d{2}$/;

type ActiveTab = "create" | "split";
type SplitType = "planning" | "contracts";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete request.";
}

export function HomePage() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");
  const [siteCode, setSiteCode] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("planning");
  const [totalContractSplits, setTotalContractSplits] = useState("2");
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
  const siteCodeIsValid = SITE_CODE_PATTERN.test(normalisedSiteCode);
  const projectRefIsValid = PROJECT_REF_PATTERN.test(normalisedProjectRef);
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
      setError("Enter a project reference like D012-01 or KK123-01.");
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

      <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
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
        ) : (
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
                  Use a project ref such as D012-01. Contract refs such as
                  D012-01-01 cannot be split again.
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
                      Splits the active project into two seperate planning
                      references.
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
                      Splits the current project into two new project contracts
                      refs such as D012-01-01 and D012-01-02.
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
        )}
      </main>
    </div>
  );
}
