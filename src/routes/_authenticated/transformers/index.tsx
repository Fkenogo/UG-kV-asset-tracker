import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transformers/")({
  head: () => ({
    meta: [{ title: "Transformers — kVAssetTracker" }],
  }),
  component: TransformersIndex,
});

function TransformersIndex() {
  return (
    <div className="px-4 md:px-8 py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Transformer registry</h1>
      <p className="text-sm text-muted-foreground mt-1">
        The full asset list and 4-step registration wizard land in Phase 3.
      </p>
      <div className="mt-6 rounded-xl border bg-warning-soft text-foreground p-5 flex items-start gap-3">
        <Construction className="size-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Coming in Phase 3</div>
          <p className="text-muted-foreground mt-1">
            Network voltage drives the kVA dropdown. Asset IDs (TRF-000001) are system-generated
            and never editable.
          </p>
        </div>
      </div>
    </div>
  );
}
