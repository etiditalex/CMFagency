"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type PortalRole = "admin" | "manager" | "client";
type PortalTier = "basic" | "pro" | "enterprise";

type PortalContextValue = {
  loading: boolean;
  isPortalMember: boolean;
  role: PortalRole | null;
  tier: PortalTier | null;
  /** Full admin: can add admins and managers. */
  isAdmin: boolean;
  /** Manager: can add clients only. Same data access as admin; UI enforces restrictions. */
  isManager: boolean;
  /** Full admin only (not manager). */
  isFullAdmin: boolean;
  refresh: () => Promise<void>;
};

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

function isMissingPortalMembersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

function isMissingAdminUsersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("admin_users") && msg.includes("does not exist"));
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPortalMember, setIsPortalMember] = useState(false);
  const [role, setRole] = useState<PortalRole | null>(null);
  const [tier, setTier] = useState<PortalTier | null>(null);

  const isAdmin = useMemo(() => role === "admin" || role === "manager", [role]);
  const isManager = useMemo(() => role === "manager", [role]);
  const isFullAdmin = useMemo(() => role === "admin", [role]);

  const refresh = async () => {
    if (!user?.id) {
      setIsPortalMember(false);
      setRole(null);
      setTier(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Prefer portal_members table (new RBAC model).
      const { data: memberRow, error: memberErr } = await supabase
        .from("portal_members")
        .select("user_id,role,tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberErr) {
        // Backward-compat fallback: if table isn't installed yet, treat admin allowlist as portal membership.
        if (isMissingPortalMembersTable(memberErr)) {
          const { data: adminRow, error: adminErr } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (adminErr) {
            if (isMissingAdminUsersTable(adminErr)) {
              setIsPortalMember(false);
              setRole(null);
              setTier(null);
              return;
            }
            throw adminErr;
          }

          if (adminRow) {
            setIsPortalMember(true);
            setRole("admin");
            setTier("enterprise");
          } else {
            setIsPortalMember(false);
            setRole(null);
            setTier(null);
          }
          return;
        }
        throw memberErr;
      }

      if (!memberRow) {
        // Backward-compat: portal_members exists, but if the user is in legacy admin_users,
        // treat them as an admin portal member to avoid lockouts during migration.
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminErr) {
          if (isMissingAdminUsersTable(adminErr)) {
            setIsPortalMember(false);
            setRole(null);
            setTier(null);
            return;
          }
          throw adminErr;
        }

        if (adminRow) {
          setIsPortalMember(true);
          setRole("admin");
          setTier("enterprise");
          return;
        }

        setIsPortalMember(false);
        setRole(null);
        setTier(null);
        return;
      }

      const r = String((memberRow as any).role ?? "client").toLowerCase();
      const t = String((memberRow as any).tier ?? "basic").toLowerCase();
      const validTier = ["basic", "pro", "enterprise"].includes(t) ? (t as PortalTier) : "basic";
      setIsPortalMember(true);
      setRole(r === "admin" ? "admin" : r === "manager" ? "manager" : "client");
      setTier(r === "admin" || r === "manager" ? "enterprise" : validTier);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setIsPortalMember(false);
      setRole(null);
      setTier(null);
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const value = useMemo<PortalContextValue>(
    () => ({
      loading: authLoading || loading,
      isPortalMember,
      role,
      tier,
      isAdmin,
      isManager,
      isFullAdmin,
      refresh,
    }),
    [authLoading, loading, isPortalMember, role, tier, isAdmin, isManager, isFullAdmin]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within a PortalProvider");
  return ctx;
}

