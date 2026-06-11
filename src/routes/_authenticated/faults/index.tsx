import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/faults")({
  head: () => ({ meta: [{ title: "Faults — kVAssetTracker" }] }),
  component: FaultsList,
});

type StatusFilter = "open" | "all" | "resolved";

function faultsQuery(status: StatusFilter) {
  return queryOptions({
    queryKey: ["faults", status],
    queryFn: async () => {
      let q = supabase
        .from("fault_records")
        .select(
          `id, fault_datetime, fault_type, severity, fault_status, customers_affected,
           fault_description, resolved_date,
           transformer:transformers(id, asset_id, site_name, network_voltage_kv)`,
        )
        .order("fault_datetime", { ascending: false })
        .limit(200);
      if (status === "open") q = q.in("fault_status", ["open", "assigned", "in_progress"]);
      if (status === "resolved") q = q.eq("fault_status", "resolved");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function FaultsList() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [downtime, setDowntime] = useState("");
  const { data: rows = [], isLoading } = useQuery(faultsQuery(status));

  const resolve = async () => {
    if (!resolvingId || !user) return;
    try {
      const { error } = await supabase
        .from("fault_records")
        .update({
          fault_status: "resolved",
          resolved_date: new Date().toISOString(),
          resolution_description: resolution || null,
          downtime_hours: downtime ? Number(downtime) : null,
          resolved_by: user.id,
        })
        .eq("id", resolvingId);
      if (error) throw error;

      const row = rows.find((r) => r.id === resolvingId);
      const t = row?.transformer as { id?: string } | null;
      if (t?.id) {
        // clear has_open_fault if no other open faults remain
        const { data: stillOpen } = await supabase
          .from("fault_records")
          .select("id", { count: "exact", head: true })
          .eq("transformer_id", t.id)
          .in("fault_status", ["open", "assigned", "in_progress"]);
        if ((stillOpen as unknown as { count?: number } | null)?.count === 0 || stillOpen == null) {
          await supabase.from("transformers").update({ has_open_fault: false }).eq("id", t.id);
        }
        await supabase.from("asset_timeline").insert({
          transformer_id: t.id,
          event_type: "fault_resolved",
          event_summary: `Fault resolved${downtime ? ` (${downtime}h downtime)` : ""}`,
          linked_record_id: resolvingId,
          created_by: user.id,
        });
      }

      toast.success("Fault resolved");
      setResolvingId(null); setResolution(""); setDowntime("");
      qc.invalidateQueries({ queryKey: ["faults"] });
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faults</h1>
          <p className="text-sm text-muted-foreground">Outages and equipment failures across the fleet.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open / In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {canDo(role, "report_fault") && (
            <Button asChild>
              <Link to="/faults/new"><Plus className="size-4 mr-1" /> Report fault</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2.5">When</th>
              <th className="text-left px-3 py-2.5">Asset</th>
              <th className="text-left px-3 py-2.5">Type</th>
              <th className="text-left px-3 py-2.5">Severity</th>
              <th className="text-left px-3 py-2.5">Customers</th>
              <th className="text-left px-3 py-2.5">Status</th>
              <th className="text-right px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                <ShieldAlert className="size-6 mx-auto mb-2 opacity-50" />
                No faults to show.
              </td></tr>
            )}
            {rows.map((r) => {
              const t = r.transformer as { id: string; asset_id: string | null; site_name: string | null; network_voltage_kv: number | null } | null;
              const canResolve = canDo(role, "resolve_fault") && r.fault_status !== "resolved";
              return (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.fault_datetime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-2.5">
                    {t ? (
                      <Link to="/transformers/$id" params={{ id: t.id }} className="font-mono text-xs text-accent hover:underline">
                        {t.asset_id}
                      </Link>
                    ) : "—"}
                    {t?.site_name && <div className="text-xs text-muted-foreground">{t.site_name}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.fault_type ?? "—"}</td>
                  <td className="px-3 py-2.5"><SeverityBadge severity={r.severity} /></td>
                  <td className="px-3 py-2.5 text-xs">{r.customers_affected ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.fault_status} /></td>
                  <td className="px-3 py-2.5 text-right">
                    {canResolve && (
                      <Button size="sm" variant="outline" onClick={() => setResolvingId(r.id)}>
                        <CheckCircle2 className="size-3.5 mr-1" /> Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!resolvingId} onOpenChange={(o) => !o && setResolvingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve fault</DialogTitle>
            <DialogDescription>Record the resolution details. Asset status will return to active if no other open faults remain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Downtime (hours)</Label>
              <Input type="number" step="0.1" value={downtime} onChange={(e) => setDowntime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution description</Label>
              <Textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was done to resolve" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingId(null)}>Cancel</Button>
            <Button onClick={resolve}>Mark resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-xs text-muted-foreground">—</span>;
  const tone: Record<string, string> = {
    minor: "bg-muted text-muted-foreground border-muted",
    major: "bg-warning/10 text-warning border-warning/30",
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    complete_outage: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return <Badge variant="outline" className={tone[severity] ?? ""}>{severity.replace(/_/g, " ")}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    open: "bg-destructive/10 text-destructive border-destructive/30",
    assigned: "bg-warning/10 text-warning border-warning/30",
    in_progress: "bg-accent/10 text-accent border-accent/30",
    resolved: "bg-success/10 text-success border-success/30",
  };
  const icon = status === "resolved" ? <CheckCircle2 className="size-3 mr-1" /> : <AlertTriangle className="size-3 mr-1" />;
  return <Badge variant="outline" className={tone[status] ?? ""}>{icon}{status.replace(/_/g, " ")}</Badge>;
}
