import { useState } from "react";
import { Link } from "react-router-dom";

import { isProgrammeAdminBootstrapEligible } from "@/domain/programmeAdminAuth";
import { useAuth } from "@/hooks/AuthContext";
import { bootstrapCurrentUserProgrammeAdmin } from "@/services/programmeAdminService";
import { useProgrammeAdminAccess } from "@/hooks/useProgrammeAdminAccess";

const launcherCards = [
  {
    title: "Project Index",
    description:
      "Search projects, manage Project Information, and maintain Reporting Programme data.",
    href: "/project-index",
    accent: "from-[#025437] to-[#8fb73e]",
    available: true,
  },
  {
    title: "Project Register",
    description:
      "Create projects, split planning or contract references, and view project lineage.",
    href: "/project-register",
    accent: "from-[#006838] to-[#025437]",
    available: true,
  },
] as const;

export function AppLauncherPage() {
  const { signOut, user } = useAuth();
  const { loading: adminAccessLoading, hasAccess: hasProgrammeAdminAccess, refresh: refreshAdminAccess } = useProgrammeAdminAccess();
  const [bootstrapState, setBootstrapState] = useState<"idle" | "saving" | "error">("idle");
  const bootstrapEligible = !adminAccessLoading && !hasProgrammeAdminAccess && isProgrammeAdminBootstrapEligible({
    isDevelopment: import.meta.env.DEV,
    configuredEmail: import.meta.env.VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL,
    currentUserEmail: user?.email,
  });
  const visibleCards = !adminAccessLoading && hasProgrammeAdminAccess
    ? [...launcherCards, {
        title: "Admin",
        description: "Maintain programme definitions and programme configuration.",
        href: "/admin",
        accent: "from-[#8fb73e] to-[#025437]",
        available: true,
      }]
    : launcherCards;

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-gray-950">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div>
            <p className="text-sm font-semibold text-[#006838]">
              Fabric Rayfin
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Apps</h1>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <span className="hidden text-sm text-gray-500 md:inline">
                Signed in as {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="rounded-4xl border border-white/70 bg-white p-8 shadow-[0_30px_80px_rgba(2,84,55,0.08)]">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#5a5a5a]">
                Workspace launcher
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-950">
                Choose your destination
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-500">
                Start in Project Index by default, or switch to Project Register
                to create, split, and review project history.
              </p>
            </div>
            <Link
              to="/project-index"
              className="rounded-full bg-[#025437] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#01462e]"
            >
              Open Project Index
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((card) => (
              <Link
                key={card.title}
                to={card.href}
                className="group rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8fb73e] hover:shadow-lg"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${card.accent} text-lg font-bold text-white`}
                >
                  {card.title
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <h3 className="text-xl font-semibold text-gray-950 group-hover:text-[#025437]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {card.description}
                </p>
                <p className="mt-6 text-sm font-semibold text-[#006838]">
                  Open app →
                </p>
              </Link>
            ))}
          </div>
          {bootstrapEligible ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#8fb73e] bg-[#f7fbf8] p-4">
              <button
                type="button"
                disabled={bootstrapState === "saving"}
                onClick={() => {
                  setBootstrapState("saving");
                  void bootstrapCurrentUserProgrammeAdmin()
                    .then(() => refreshAdminAccess())
                    .then(() => setBootstrapState("idle"))
                    .catch(() => setBootstrapState("error"));
                }}
                className="rounded-full bg-[#025437] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {bootstrapState === "saving" ? "Bootstrapping..." : "Bootstrap Admin access"}
              </button>
              {bootstrapState === "error" ? <p className="mt-2 text-sm text-red-700">Unable to bootstrap Admin access.</p> : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
