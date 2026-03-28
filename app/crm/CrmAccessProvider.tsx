"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CrmStaffAccess } from "@/lib/crm/staff-access";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type { CrmStaffAccess };

const Ctx = createContext<{
  staff: CrmStaffAccess | null;
  loading: boolean;
  refresh: () => Promise<void>;
} | null>(null);

export function useCrmAccess() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrmAccess outside CrmAccessProvider");
  return v;
}

export function CrmAccessProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<CrmStaffAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStaff(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("crm_staff")
      .select("can_access_retail, can_access_b2b, is_admin, can_confirm_success")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setStaff(null);
      setLoading(false);
      return;
    }

    setStaff({
      can_access_retail: Boolean(data.can_access_retail),
      can_access_b2b: Boolean(data.can_access_b2b),
      is_admin: Boolean(data.is_admin),
      can_confirm_success: Boolean(
        (data as { can_confirm_success?: boolean }).can_confirm_success ?? true
      ),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ staff, loading, refresh }), [staff, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
