import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["super_admin", "territory_manager", "engineer", "field_technician", "viewer"] as const;

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin role required");
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: profiles, error: pErr } = await context.supabase
      .from("profiles")
      .select("id,email,full_name,territory_id,service_area_id,is_active,created_at")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);
    const { data: roles, error: rErr } = await context.supabase
      .from("user_roles")
      .select("user_id,role");
    if (rErr) throw new Error(rErr.message);
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] }));
  });

export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email(),
      full_name: z.string().min(1),
      role: z.enum(ROLES),
      territory_id: z.string().uuid().nullable().optional(),
      service_area_id: z.string().uuid().nullable().optional(),
      password: z.string().min(8).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = data.password ?? `Temp-${crypto.randomUUID().slice(0, 8)}!Aa1`;
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Failed to create user");

    const uid = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: uid,
        email: data.email,
        full_name: data.full_name,
        territory_id: data.territory_id ?? null,
        service_area_id: data.service_area_id ?? null,
      });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { id: uid, email: data.email, temporary_password: data.password ? null : tempPassword };
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().min(1).optional(),
      role: z.enum(ROLES).optional(),
      territory_id: z.string().uuid().nullable().optional(),
      service_area_id: z.string().uuid().nullable().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: {
      full_name?: string;
      territory_id?: string | null;
      service_area_id?: string | null;
      is_active?: boolean;
    } = {};
    if (data.full_name !== undefined) updates.full_name = data.full_name;
    if (data.territory_id !== undefined) updates.territory_id = data.territory_id;
    if (data.service_area_id !== undefined) updates.service_area_id = data.service_area_id;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const resetAdminUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = `Temp-${crypto.randomUUID().slice(0, 8)}!Aa1`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: tempPassword,
    });
    if (error) throw new Error(error.message);
    return { temporary_password: tempPassword };
  });
