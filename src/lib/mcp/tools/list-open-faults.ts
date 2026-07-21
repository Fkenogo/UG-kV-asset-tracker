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
  name: "list_open_faults",
  title: "List open faults",
  description:
    "List open transformer fault reports (status open, assigned, or in_progress), optionally filtered by severity. Returns up to 50 rows visible to the signed-in user.",
  inputSchema: {
    severity: z
      .enum(["minor", "major", "critical", "complete_outage"])
      .optional()
      .describe("Optional fault severity filter."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ severity, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("fault_records")
      .select("id, transformer_id, severity, status, description, reported_at, created_at")
      .in("status", ["open", "assigned", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (severity) q = q.eq("severity", severity);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { faults: data ?? [] },
    };
  },
});
