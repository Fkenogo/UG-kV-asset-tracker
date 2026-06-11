import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/inspections/new")({
  head: () => ({ meta: [{ title: "New inspection — kVAssetTracker" }] }),
  validateSearch: searchSchema,
  component: NewInspection,
});

function transformersListQ() {
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

function NewInspection() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/inspections/new" });
  const transformersQ = useQuery(transformersListQ());

  const [transformerId, setTransformerId] = useState(search.transformerId ?? "");
  const [visitType, setVisitType] = useState("routine");
  const [loadA, setLoadA] = useState("");
  const [loadB, setLoadB] = useState("");
  const [loadC, setLoadC] = useState("");
  const [voltageHv, setVoltageHv] = useState("");
  const [voltageLv, setVoltageLv] = useState("");
  const [rust, setRust] = useState("");
  const [oilLeak, setOilLeak] = useState("");
  const [bushing, setBushing] = useState("");
  const [oilLevel, setOilLevel] = useState("");
  const [silica, setSilica] = useState("");
  const [vegetation, setVegetation] = useState("");
  const [security, setSecurity] = useState("");
  const [unauth, setUnauth] = useState(false);
  const [oilTestRequired, setOilTestRequired] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [recommended, setRecommended] = useState("");
  const [gps, setGps] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [submitting, setSubmitting] = useState(false);

  // Load %: max of three phases vs. kVA (approx with assumed voltage)
  const picked = transformersQ.data?.find((t) => t.id === transformerId);
  const loadPercentage = useMemo(() => {
    const phases = [loadA, loadB, loadC].map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (phases.length === 0 || !picked?.kva_rating || !picked.network_voltage_kv) return null;
    const maxAmps = Math.max(...phases);
    // P (kVA) ≈ sqrt(3) * V(kV) * I(A); load% = I_actual / I_rated * 100
    const ratedAmps = (picked.kva_rating) / (Math.sqrt(3) * picked.network_voltage_kv);
    return Math.round((maxAmps / ratedAmps) * 100);
  }, [loadA, loadB, loadC, picked]);

  useEffect(() => {
    if (search.transformerId) setTransformerId(search.transformerId);
  }, [search.transformerId]);

  if (!canDo(role, "log_inspection")) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card><CardContent className="pt-6">
          <p className="text-sm">You don't have permission to log inspections.</p>
          <Button asChild variant="link" className="px-0 mt-2"><Link to="/inspections">← Back</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const captureGps = () => {
    if (!("geolocation" in navigator)) { toast.error("Geolocation unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude.toFixed(8), lng: pos.coords.longitude.toFixed(8) });
        toast.success(`GPS captured (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => toast.error(`GPS failed: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const submit = async () => {
    if (!user) return;
    if (!transformerId) { toast.error("Select a transformer"); return; }
    setSubmitting(true);
    try {
      const overload = loadPercentage != null && loadPercentage >= 80;
      const payload = {
        transformer_id: transformerId,
        inspector_id: user.id,
        inspection_date: new Date().toISOString(),
        visit_type: visitType,
        gps_lat: gps.lat ? Number(gps.lat) : null,
        gps_lng: gps.lng ? Number(gps.lng) : null,
        load_phase_a: loadA ? Number(loadA) : null,
        load_phase_b: loadB ? Number(loadB) : null,
        load_phase_c: loadC ? Number(loadC) : null,
        voltage_hv: voltageHv ? Number(voltageHv) : null,
        voltage_lv: voltageLv ? Number(voltageLv) : null,
        load_percentage: loadPercentage,
        overload_flag: overload,
        rust_condition: rust || null,
        oil_leakage: oilLeak || null,
        bushing_condition: bushing || null,
        oil_level: oilLevel || null,
        silica_gel_color: silica || null,
        oil_test_required: oilTestRequired,
        vegetation_encroachment: vegetation || null,
        security_fencing: security || null,
        unauthorized_connections: unauth,
        condition_narrative: narrative || null,
        recommended_action: recommended || null,
      };
      const { data: inserted, error } = await supabase
        .from("inspections")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("asset_timeline").insert({
        transformer_id: transformerId,
        event_type: "inspection",
        event_summary: overload
          ? `Inspection logged — overload ${loadPercentage}%`
          : `Inspection logged${loadPercentage != null ? ` — load ${loadPercentage}%` : ""}`,
        related_record_id: inserted.id,
        created_by: user.id,
      });

      toast.success("Inspection saved");
      navigate({ to: "/transformers/$id", params: { id: transformerId } });
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/inspections"><ArrowLeft className="size-4 mr-1" /> Back</Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">New inspection</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Log condition, load readings, and recommendations. Overload (≥80%) auto-flags.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6 space-y-4">
          <FormRow label="Transformer *">
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
          </FormRow>

          <FormRow label="Visit type">
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="post_fault">Post-fault</SelectItem>
                <SelectItem value="commissioning">Commissioning</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>

          <div className="rounded-md border bg-muted/20 p-3 space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Load readings (Amps)</div>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="Phase A"><Input type="number" value={loadA} onChange={(e) => setLoadA(e.target.value)} /></FormRow>
              <FormRow label="Phase B"><Input type="number" value={loadB} onChange={(e) => setLoadB(e.target.value)} /></FormRow>
              <FormRow label="Phase C"><Input type="number" value={loadC} onChange={(e) => setLoadC(e.target.value)} /></FormRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="HV voltage"><Input type="number" value={voltageHv} onChange={(e) => setVoltageHv(e.target.value)} /></FormRow>
              <FormRow label="LV voltage"><Input type="number" value={voltageLv} onChange={(e) => setVoltageLv(e.target.value)} /></FormRow>
            </div>
            {loadPercentage != null && (
              <div className={`text-sm font-medium ${loadPercentage >= 80 ? "text-destructive" : "text-success"}`}>
                Computed load: {loadPercentage}% {loadPercentage >= 80 && "⚠ Overload"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Picker label="Rust" value={rust} onChange={setRust} options={["good", "fair", "poor"]} />
            <Picker label="Oil leakage" value={oilLeak} onChange={setOilLeak} options={["none", "minor", "major"]} />
            <Picker label="Bushing" value={bushing} onChange={setBushing} options={["good", "cracked", "broken"]} />
            <Picker label="Oil level" value={oilLevel} onChange={setOilLevel} options={["full", "low", "very_low"]} />
            <Picker label="Silica gel" value={silica} onChange={setSilica} options={["blue", "pink", "white"]} />
            <Picker label="Vegetation" value={vegetation} onChange={setVegetation} options={["clear", "encroaching", "severe"]} />
            <Picker label="Security fencing" value={security} onChange={setSecurity} options={["good", "damaged", "missing"]} />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={unauth} onCheckedChange={(v) => setUnauth(v === true)} />
              Unauthorized connections seen
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={oilTestRequired} onCheckedChange={(v) => setOilTestRequired(v === true)} />
              Oil test required
            </label>
          </div>

          <FormRow label="Condition notes">
            <Textarea rows={3} value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="Overall observations…" />
          </FormRow>
          <FormRow label="Recommended action">
            <Textarea rows={2} value={recommended} onChange={(e) => setRecommended(e.target.value)} placeholder="e.g. schedule oil top-up; clear vegetation" />
          </FormRow>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={captureGps}>
              <MapPin className="size-4 mr-1.5" /> Capture GPS
            </Button>
            {gps.lat && <span className="text-xs font-mono text-muted-foreground">{Number(gps.lat).toFixed(5)}, {Number(gps.lng).toFixed(5)}</span>}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={submitting || !transformerId}>
              {submitting ? "Saving…" : "Save inspection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Picker({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <FormRow label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormRow>
  );
}
