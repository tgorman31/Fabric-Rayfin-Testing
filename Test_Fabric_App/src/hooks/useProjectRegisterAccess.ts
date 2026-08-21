import { useEffect, useState } from "react";

import { getProjectRegisterAccess } from "@/services/projectIndexService";

export function useProjectRegisterAccess() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const allowed = await getProjectRegisterAccess();
        if (!cancelled) {
          setHasAccess(allowed);
        }
      } catch {
        if (!cancelled) {
          setHasAccess(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, hasAccess };
}
