import { useEffect, useState } from "react";

import { getProgrammeAdminAccess } from "@/services/programmeAdminService";

export function useProgrammeAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getProgrammeAdminAccess()
      .then((allowed) => {
        if (!cancelled) setHasAccess(allowed);
      })
      .catch(() => {
        if (!cancelled) setHasAccess(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, hasAccess };
}
