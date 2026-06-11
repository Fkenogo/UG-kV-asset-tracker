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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const searchSchema = z.object({ transformerId: z.string().optional() });

export const Route = createFileRoute("/_authenticated/maintenance/new")({
  head: () => ({ meta: [{ title: "Log maintenance — kVAssetTracker" }] }),
  validateSearch: searchSchema,
  component: NewMaintenance,
});

function NewMaintenance() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/maintenance/new" });
  const transformersQ = useQuery(queryOptions({
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
  }));

  const [transformerId, setTransformerId] = useState(search.transformerId ?? "");
  const [maintenanceType, setMaintenanceType] = useState("preventive");
  const [team, setTeam] = useState("");
  const [oilTopup, setOilTopup] = useState(false);
  const [oilLiters, setOilLiters] = useState("");
  const [oilReplacement, setOilReplacement] = useState(false);
  const [oilFiltration, setOilFiltration] = useState(false);
  const [silica, setSilica] = useState(false);
  const [bushing, setBushing] = useState(false);
  const [tapChanger, setTapChanger] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [partsUsed, setPartsUsed] = useState("");
  const [otherWork, setOtherWork] = useState("");
  const [postNotes, setPostNotes] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!canDo(role, "log_maintenance")) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card><CardContent className="pt-6">
          <p className="text-sm">You don't have permission to log maintenance.</p>
          <Button asChild variant="link" className="px-0 mt-2"><Link to="/transformers">← Back</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const submit = async () => {
    if (!user) return;
    if (!transformerId) { toast.error("Select a transformer"); return; }
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("maintenance_records")
        .insert({
          transformer_id: transformerId,
          technician_id: user.id,
          maintenance_date: new Date().toISOString(),
          maintenance_type: maintenanceType,
          team_contractor: team || null,
          oil_topup: oilTopup,
          oil_topup_liters: oilLiters ? Number(oilLiters) : null,
          oil_replacement: oilReplacement,
          oil_filtration: oilFiltration,
          silica_gel_replaced: silica,
          bushing_replacement: bushing,
          tap_changer_service: tapChanger,
          cooling_service: cooling,
          physical_cleaning: cleaning,
          other_work: otherWork || null,
          parts_used: partsUsed || null,
          post_condition_narrative: postNotes || null,
          next_maintenance_date: nextDate || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("asset_timeline").insert({
        transformer_id: transformerId,
        event_type: "maintenance",
        event_summary: `${maintenanceType} maintenance completed`,
        related_record_id: inserted.id,
        created_by: user.id,
      });

      toast.success("Maintenance logged");
      navigate({ to: "/transformers/$id", params: { id: transformerId } });
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const Tick = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/transformers"><ArrowLeft className="size-4 mr-1" /> Back</Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Log maintenance</h1>

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
            <Row label="Type">
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Team / contractor"><Input value={team} onChange={(e) => setTeam(e.target.value)} /></Row>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Work performed</div>
            <div className="grid grid-cols-2 gap-2">
              <Tick checked={oilTopup} onChange={setOilTopup} label="Oil top-up" />
              <Tick checked={oilReplacement} onChange={setOilReplacement} label="Oil replacement" />
              <Tick checked={oilFiltration} onChange={setOilFiltration} label="Oil filtration" />
              <Tick checked={silica} onChange={setSilica} label="Silica gel replaced" />
              <Tick checked={bushing} onChange={setBushing} label="Bushing replacement" />
              <Tick checked={tapChanger} onChange={setTapChanger} label="Tap-changer service" />
              <Tick checked={cooling} onChange={setCooling} label="Cooling service" />
              <Tick checked={cleaning} onChange={setCleaning} label="Physical cleaning" />
            </div>
            {oilTopup && (
              <Row label="Oil top-up (litres)">
                <Input type="number" step="0.1" value={oilLiters} onChange={(e) => setOilLiters(e.target.value)} />
              </Row>
            )}
          </div>

          <Row label="Parts used"><Input value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} /></Row>
          <Row label="Other work"><Textarea rows={2} value={otherWork} onChange={(e) => setOtherWork(e.target.value)} /></Row>
          <Row label="Post-condition notes"><Textarea rows={2} value={postNotes} onChange={(e) => setPostNotes(e.target.value)} /></Row>
          <Row label="Next maintenance date">
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </Row>

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={submitting || !transformerId}>
              {submitting ? "Saving…" : "Save maintenance"}
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
