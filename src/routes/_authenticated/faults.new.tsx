import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const searchSchema = z.object({ transformerId: z.string().optional() });

export const Route = createFileRoute("/_authenticated/faults/new")({
  head: () => ({ meta: [{ title: "Report fault — kVAssetTracker" }] }),
  validateSearch: searchSchema,
  component: NewFault,
});

function ReportFaultPicker() {
  return queryOptions({
    queryKey: ["transformers", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformers")
        .select("id, asset_id, site_name, kva_rating, network_voltage_kv")
        .order("asset_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function NewFault() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/faults/new" });
  const transformersQ = useQuery(ReportFaultPicker());

  const [transformerId, setTransformerId] = useState(search.transformerId ?? "");
  const [faultType, setFaultType] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("");
  const [customers, setCustomers] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!canDo(role, "report_fault")) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card><CardContent className="pt-6">
          <p className="text-sm">You don't have permission to report faults.</p>
          <Button asChild variant="link" className="px-0 mt-2"><Link to="/faults">← Back</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const submit = async () => {
    if (!user) return;
    if (!transformerId) { toast.error("Select a transformer"); return; }
    if (!severity) { toast.error("Severity is required"); return; }
    setSubmitting(true);
    try {
      const picked = transformersQ.data?.find((t) => t.id === transformerId);
      const { data: inserted, error } = await supabase
        .from("fault_records")
        .insert({
          transformer_id: transformerId,
          reported_by: user.id,
          fault_datetime: new Date().toISOString(),
          fault_source: source || null,
          fault_type: faultType || null,
          severity,
          network_voltage_kv: picked?.network_voltage_kv ?? null,
          customers_affected: customers ? Number(customers) : null,
          area_affected: area || null,
          fault_description: description || null,
          fault_status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Flag transformer with open fault + mark faulty for critical/complete_outage
      const update: { has_open_fault: boolean; operational_status?: "faulty" } = { has_open_fault: true };
      if (severity === "critical" || severity === "complete_outage") {
        update.operational_status = "faulty";
      }
      await supabase.from("transformers").update(update).eq("id", transformerId);

      await supabase.from("asset_timeline").insert({
        transformer_id: transformerId,
        event_type: "fault_reported",
        event_summary: `${severity.replace(/_/g, " ")} fault reported${faultType ? ` (${faultType})` : ""}`,
        linked_record_id: inserted.id,
        created_by: user.id,
      });

      toast.success("Fault reported");
      navigate({ to: "/transformers/$id", params: { id: transformerId } });
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/faults"><ArrowLeft className="size-4 mr-1" /> Back</Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Report a fault</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Critical and complete-outage events mark the asset as faulty immediately.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6 space-y-4">
          <Row label="Transformer *">
            <Select value={transformerId} onValueChange={setTransformerId}>
              <SelectTrigger><SelectValue placeholder="Select transformer" /></SelectTrigger>
              <SelectContent>
                {(transformersQ.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.asset_id} — {t.site_name ?? "Unnamed"} ({t.kva_rating}kVA/{t.network_voltage_kv}kV)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <div className="grid sm:grid-cols-2 gap-3">
            <Row label="Severity *">
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue placeholder="Pick severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="complete_outage">Complete outage</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Fault type">
              <Select value={faultType} onValueChange={setFaultType}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bushing_failure">Bushing failure</SelectItem>
                  <SelectItem value="oil_leak">Oil leak</SelectItem>
                  <SelectItem value="winding_failure">Winding failure</SelectItem>
                  <SelectItem value="overheating">Overheating</SelectItem>
                  <SelectItem value="lightning">Lightning strike</SelectItem>
                  <SelectItem value="vandalism">Vandalism</SelectItem>
                  <SelectItem value="overload">Overload</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Source">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_report">Customer report</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="scada">SCADA</SelectItem>
                  <SelectItem value="field_observation">Field observation</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Customers affected">
              <Input type="number" value={customers} onChange={(e) => setCustomers(e.target.value)} />
            </Row>
          </div>

          <Row label="Area affected">
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Villages / blocks impacted" />
          </Row>
          <Row label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
          </Row>

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={submitting || !transformerId || !severity}>
              {submitting ? "Reporting…" : "Report fault"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
