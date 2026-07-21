import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getTransformer from "./tools/get-transformer";
import listOpenFaults from "./tools/list-open-faults";
import listTransformers from "./tools/list-transformers";
import myProfile from "./tools/my-profile";

// OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kvassettracker-mcp",
  title: "kVAssetTracker MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the UEDCL kVAssetTracker transformer registry. Use list_transformers to search assets, get_transformer to inspect one, list_open_faults for outstanding faults, and my_profile to confirm the connected user. All results are scoped by the signed-in user's role and territory.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTransformers, getTransformer, listOpenFaults, myProfile],
});
