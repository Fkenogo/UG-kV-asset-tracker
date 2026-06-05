import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AuthUser, Profile, Role } from "@/types";

/**
 * Auth + profile + roles for the current user.
 * Wire it into any component that needs the signed-in user or their role.
 * Role data comes from the `user_roles` table (separate from `profiles` for security).
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    // Listener first to avoid missing the initial event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["auth", "profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, territory_id, service_area_id, is_active")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const rolesQuery = useQuery({
    queryKey: ["auth", "roles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data ?? []) as { role: Role }[]).map((r) => r.role);
    },
  });

  const roles = rolesQuery.data ?? [];
  const primaryRole = pickPrimaryRole(roles);

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        profile: profileQuery.data ?? null,
        roles,
        primaryRole,
      }
    : null;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    // Routing happens via onAuthStateChange listener in __root.tsx.
  }

  return {
    session,
    user,
    role: primaryRole,
    isAuthenticated: !!session,
    loading: !sessionLoaded || (!!userId && (profileQuery.isLoading || rolesQuery.isLoading)),
    signOut,
  };
}

const ROLE_PRIORITY: Role[] = [
  "super_admin",
  "engineer",
  "territory_manager",
  "field_technician",
  "viewer",
];

function pickPrimaryRole(roles: Role[]): Role | null {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return null;
}
