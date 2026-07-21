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
  name: "get_transformer",
  title: "Get transformer",
  description:
    "Fetch the full profile of a single transformer by its asset_id (e.g. TRF-000123) or database id (uuid).",
  inputSchema: {
    identifier: z
      .string()
      .min(1)
      .describe("Transformer asset_id (TRF-######) or uuid."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ identifier }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f-]{36}$/i.test(identifier);
    const { data, error } = await sb
      .from("transformers")
      .select("*")
      .eq(isUuid ? "id" : "asset_id", identifier)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return { content: [{ type: "text", text: `No transformer found for ${identifier}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { transformer: data },
    };
  },
});
