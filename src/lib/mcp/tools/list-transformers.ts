import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_transformers",
  title: "List transformers",
  description:
    "List transformers in the kVAssetTracker registry, optionally filtered by search term, voltage, or open-fault status. Returns up to 50 rows scoped to the signed-in user's role and territory.",
  inputSchema: {
    search: z
      .string()
      .optional()
      .describe("Optional text to match against asset_id, serial_number, or site_name."),
    voltage: z
      .number()
      .optional()
      .describe("Optional network voltage filter: 11 or 33 (kV)."),
    only_open_faults: z
      .boolean()
      .optional()
      .describe("If true, only return transformers currently flagged with an open fault."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, voltage, only_open_faults, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("transformers")
      .select(
        "id, asset_id, serial_number, site_name, network_voltage, kva, operational_status, has_open_fault, territory_id",
      )
      .order("asset_id", { ascending: true })
      .limit(limit ?? 25);
    if (voltage) q = q.eq("network_voltage", voltage);
    if (only_open_faults) q = q.eq("has_open_fault", true);
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`asset_id.ilike.${s},serial_number.ilike.${s},site_name.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { transformers: data ?? [] },
    };
  },
});
