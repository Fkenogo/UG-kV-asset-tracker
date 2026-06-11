import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ClipboardCheck, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/inspections")({
  head: () => ({ meta: [{ title: "Inspections — kVAssetTracker" }] }),
  component: InspectionsList,
});

function inspectionsQuery() {
  return queryOptions({
    queryKey: ["inspections", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select(
          `id, inspection_date, visit_type, load_percentage, overload_flag,
           rating_discrepancy_flag, recommended_action,
           transformer:transformers(id, asset_id, site_name, kva_rating, network_voltage_kv)`,
        )
        .order("inspection_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function InspectionsList() {
  const { role } = useAuth();
  const { data: rows = [], isLoading } = useQuery(inspectionsQuery());

  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
          <p className="text-sm text-muted-foreground">Most recent 100 inspections across the fleet.</p>
        </div>
        {canDo(role, "log_inspection") && (
          <Button asChild>
            <Link to="/inspections/new"><Plus className="size-4 mr-1" /> New inspection</Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2.5">Date</th>
              <th className="text-left px-3 py-2.5">Asset</th>
              <th className="text-left px-3 py-2.5">Site</th>
              <th className="text-left px-3 py-2.5">Visit</th>
              <th className="text-left px-3 py-2.5">Load %</th>
              <th className="text-left px-3 py-2.5">Flags</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                <ClipboardCheck className="size-6 mx-auto mb-2 opacity-50" />
                No inspections logged yet.
              </td></tr>
            )}
            {rows.map((r) => {
              const t = r.transformer as { id: string; asset_id: string | null; site_name: string | null; kva_rating: number | null; network_voltage_kv: number | null } | null;
              return (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {new Date(r.inspection_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5">
                    {t ? (
                      <Link to="/transformers/$id" params={{ id: t.id }} className="font-mono text-xs text-accent hover:underline">
                        {t.asset_id}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5">{t?.site_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{r.visit_type ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {r.load_percentage != null ? `${Number(r.load_percentage).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 space-x-1">
                    {r.overload_flag && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Overload</Badge>}
                    {r.rating_discrepancy_flag && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Rating mismatch</Badge>}
                    {!r.overload_flag && !r.rating_discrepancy_flag && <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
