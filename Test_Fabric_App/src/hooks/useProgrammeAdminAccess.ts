import { useCallback, useEffect, useState } from "react";

import { getProgrammeAdminAccess } from "@/services/programmeAdminService";

export function useProgrammeAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setHasAccess(await getProgrammeAdminAccess());
    } catch {
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, hasAccess, refresh };
}
