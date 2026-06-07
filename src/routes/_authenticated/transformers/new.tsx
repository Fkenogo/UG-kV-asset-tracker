import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { KVA_OPTIONS, type NetworkVoltage } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/transformers/new")({
  head: () => ({ meta: [{ title: "Register transformer — kVAssetTracker" }] }),
  component: AddTransformer,
});

type PhotoCategory = "nameplate" | "full_transformer" | "site" | "installation";
const PHOTO_CATEGORIES: { id: PhotoCategory; label: string; hint: string }[] = [
  { id: "nameplate", label: "Nameplate", hint: "Clearly show kVA and voltage ratings" },
  { id: "full_transformer", label: "Full transformer", hint: "Overall view of the unit" },
  { id: "site", label: "Site / environment", hint: "Surrounding area" },
  { id: "installation", label: "Installation", hint: "Installation or commissioning photos" },
];

interface FormState {
  // Step 1
  network_voltage_kv: NetworkVoltage | null;
  kva_rating: number | null;
  voltage_secondary: string;
  phase_type: string;
  cooling_type: string;
  mounting_type: string;
  vector_group: string;
  // Step 2
  territory_id: string;
  service_area_id: string;
  feeder_name: string;
  feeder_code: string;
  substation_name: string;
  district_id: string;
  sub_county: string;
  parish: string;
  village: string;
  site_name: string;
  latitude: string;
  longitude: string;
  gps_accuracy: number | null;
  // Step 3
  manufacturer: string;
  serial_number: string;
  year_manufactured: string;
  uedcl_reference: string;
  install_date: string;
  installing_contractor: string;
  commissioned_by: string;
  commissioning_date: string;
  warranty_expiry: string;
}

const initial: FormState = {
  network_voltage_kv: null,
  kva_rating: null,
  voltage_secondary: "",
  phase_type: "",
  cooling_type: "",
  mounting_type: "",
  vector_group: "",
  territory_id: "",
  service_area_id: "",
  feeder_name: "",
  feeder_code: "",
  substation_name: "",
  district_id: "",
  sub_county: "",
  parish: "",
  village: "",
  site_name: "",
  latitude: "",
  longitude: "",
  gps_accuracy: null,
  manufacturer: "",
  serial_number: "",
  year_manufactured: "",
  uedcl_reference: "",
  install_date: "",
  installing_contractor: "",
  commissioned_by: "",
  commissioning_date: "",
  warranty_expiry: "",
};

const STEPS = ["Network & specs", "Location", "Identity", "Photos"] as const;

function AddTransformer() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [photos, setPhotos] = useState<Record<PhotoCategory, File[]>>({
    nameplate: [], full_transformer: [], site: [], installation: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupAsset, setDupAsset] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<null | (() => void)>(null);

  if (!canDo(role, "add_transformer")) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card><CardContent className="pt-6">
          <p className="text-sm">You don't have permission to register transformers.</p>
          <Button asChild variant="link" className="px-0 mt-2">
            <Link to="/transformers">← Back to list</Link>
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Reference data
  const territoriesQ = useQuery(queryOptions({
    queryKey: ["service_territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_territories").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  }));

  const areasQ = useQuery({
    queryKey: ["service_areas", form.territory_id],
    enabled: !!form.territory_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_areas")
        .select("id,name")
        .eq("territory_id", form.territory_id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const districtsQ = useQuery(queryOptions({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("districts").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  }));

  // kVA options always come from PRD constants (consistent both voltages).
  const kvaOptions = useMemo(() => KVA_OPTIONS, []);

  // Reset kVA if voltage changes — preserve only if still in list.
  useEffect(() => {
    if (form.network_voltage_kv && form.kva_rating && !kvaOptions.includes(form.kva_rating)) {
      update("kva_rating", null);
    }
  }, [form.network_voltage_kv]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step validation
  const errors = stepErrors(step, form);
  const canNext = Object.keys(errors).length === 0;

  const captureGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not available in this browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude.toFixed(8));
        update("longitude", pos.coords.longitude.toFixed(8));
        update("gps_accuracy", pos.coords.accuracy);
        setGpsLoading(false);
        toast.success(`GPS captured (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setGpsLoading(false);
        toast.error(`GPS failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const onPickPhotos = async (cat: PhotoCategory, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setPhotos((p) => ({ ...p, [cat]: [...p[cat], ...arr] }));
  };

  const removePhoto = (cat: PhotoCategory, idx: number) =>
    setPhotos((p) => ({ ...p, [cat]: p[cat].filter((_, i) => i !== idx) }));

  const performSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload = {
        network_voltage_kv: form.network_voltage_kv,
        kva_rating: form.kva_rating,
        voltage_secondary: form.voltage_secondary || null,
        phase_type: form.phase_type || null,
        cooling_type: form.cooling_type || null,
        mounting_type: form.mounting_type || null,
        vector_group: form.vector_group || null,
        territory_id: form.territory_id || null,
        service_area_id: form.service_area_id || null,
        substation_name: form.substation_name || null,
        district_id: form.district_id || null,
        sub_county: form.sub_county || null,
        parish: form.parish || null,
        village: form.village || null,
        site_name: form.site_name,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        gps_accuracy: form.gps_accuracy ?? null,
        gps_method: form.gps_accuracy ? "field_captured" : "manual",
        manufacturer: form.manufacturer || null,
        serial_number: form.serial_number || null,
        year_manufactured: form.year_manufactured ? Number(form.year_manufactured) : null,
        uedcl_reference: form.uedcl_reference || null,
        install_date: form.install_date || null,
        installing_contractor: form.installing_contractor || null,
        commissioned_by: form.commissioned_by || null,
        commissioning_date: form.commissioning_date || null,
        warranty_expiry: form.warranty_expiry || null,
        record_status: "active",
        operational_status: "unverified",
        created_by: user.id,
        updated_by: user.id,
      };

      const { data: inserted, error } = await supabase
        .from("transformers")
        .insert(payload)
        .select("id, asset_id")
        .single();
      if (error) throw error;

      // Upload photos
      const photoRows: {
        transformer_id: string; photo_category: string; image_url: string; captured_by: string;
      }[] = [];
      for (const cat of PHOTO_CATEGORIES) {
        for (const file of photos[cat.id]) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true,
            });
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const path = `${inserted.id}/${cat.id}/${Date.now()}-${cryptoRandom()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("asset-photos")
              .upload(path, compressed, { contentType: compressed.type || file.type });
            if (upErr) throw upErr;
            photoRows.push({
              transformer_id: inserted.id,
              photo_category: cat.id,
              image_url: path,
              captured_by: user.id,
            });
          } catch (err) {
            console.error("Photo upload failed", err);
            toast.error(`Photo upload failed: ${(err as Error).message}`);
          }
        }
      }
      if (photoRows.length > 0) {
        const { error: photoErr } = await supabase.from("asset_photos").insert(photoRows);
        if (photoErr) console.error(photoErr);
      }

      // Timeline entry
      await supabase.from("asset_timeline").insert({
        transformer_id: inserted.id,
        event_type: "registration",
        event_summary: `Transformer ${inserted.asset_id} registered`,
        created_by: user.id,
      });

      toast.success(`${inserted.asset_id} registered`);
      navigate({ to: "/transformers/$id", params: { id: inserted.id } });
    } catch (err) {
      console.error(err);
      toast.error(`Registration failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const checkDupAndSubmit = async () => {
    if (form.serial_number.trim()) {
      const { data } = await supabase
        .from("transformers")
        .select("asset_id")
        .eq("serial_number", form.serial_number.trim())
        .maybeSingle();
      if (data?.asset_id) {
        setDupAsset(data.asset_id);
        setPendingSubmit(() => performSubmit);
        setDupOpen(true);
        return;
      }
    }
    await performSubmit();
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/transformers"><ArrowLeft className="size-4 mr-1" /> Back to list</Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">Register transformer</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Asset ID is generated on save. Network voltage drives the kVA dropdown.
      </p>

      {/* Stepper */}
      <ol className="flex items-center justify-between gap-2 mt-6 mb-6">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex-1 flex items-center gap-2">
              <div className={`size-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                active ? "bg-primary text-primary-foreground border-primary" :
                done ? "bg-success text-success-foreground border-success" :
                "bg-background text-muted-foreground"
              }`}>
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"} hidden sm:block`}>
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {step === 0 && (
            <>
              <Field label="Network voltage *" error={errors.network_voltage_kv}>
                <Select
                  value={form.network_voltage_kv?.toString() ?? ""}
                  onValueChange={(v) => update("network_voltage_kv", Number(v) as NetworkVoltage)}
                >
                  <SelectTrigger><SelectValue placeholder="Select voltage first" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11">11kV</SelectItem>
                    <SelectItem value="33">33kV</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="kVA rating *" error={errors.kva_rating}>
                <Select
                  value={form.kva_rating?.toString() ?? ""}
                  onValueChange={(v) => update("kva_rating", Number(v))}
                  disabled={!form.network_voltage_kv}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.network_voltage_kv ? "Select kVA" : "Pick voltage first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {kvaOptions.map((k) => (
                      <SelectItem key={k} value={k.toString()}>{k} kVA</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {form.network_voltage_kv && form.kva_rating && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Display rating: </span>
                  <span className="font-mono font-semibold text-primary">
                    {form.kva_rating}kVA / {form.network_voltage_kv}kV
                  </span>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Secondary voltage">
                  <SimpleSelect value={form.voltage_secondary} onChange={(v) => update("voltage_secondary", v)} options={["415V", "240V", "Other"]} />
                </Field>
                <Field label="Phase type">
                  <SimpleSelect value={form.phase_type} onChange={(v) => update("phase_type", v)} options={["Single Phase", "Three Phase"]} />
                </Field>
                <Field label="Cooling type">
                  <SimpleSelect value={form.cooling_type} onChange={(v) => update("cooling_type", v)} options={["ONAN", "ONAF", "OFAF"]} />
                </Field>
                <Field label="Mounting type">
                  <SimpleSelect value={form.mounting_type} onChange={(v) => update("mounting_type", v)} options={["Pole Mounted", "Plinth", "Ground", "Indoor Substation"]} />
                </Field>
              </div>
              <Field label="Vector group">
                <Input value={form.vector_group} onChange={(e) => update("vector_group", e.target.value)} placeholder="e.g. Dyn11" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Service territory *" error={errors.territory_id}>
                  <Select value={form.territory_id} onValueChange={(v) => { update("territory_id", v); update("service_area_id", ""); }}>
                    <SelectTrigger><SelectValue placeholder="Select territory" /></SelectTrigger>
                    <SelectContent>
                      {(territoriesQ.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Service area *" error={errors.service_area_id}>
                  <Select value={form.service_area_id} onValueChange={(v) => update("service_area_id", v)} disabled={!form.territory_id}>
                    <SelectTrigger><SelectValue placeholder={form.territory_id ? "Select area" : "Pick territory first"} /></SelectTrigger>
                    <SelectContent>
                      {(areasQ.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                      {areasQ.data && areasQ.data.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">No areas registered yet</div>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Feeder name"><Input value={form.feeder_name} onChange={(e) => update("feeder_name", e.target.value)} /></Field>
                <Field label="Feeder code"><Input value={form.feeder_code} onChange={(e) => update("feeder_code", e.target.value)} /></Field>
                <Field label="Substation name"><Input value={form.substation_name} onChange={(e) => update("substation_name", e.target.value)} /></Field>
                <Field label="District">
                  <Select value={form.district_id} onValueChange={(v) => update("district_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {(districtsQ.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                      {districtsQ.data && districtsQ.data.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">No districts seeded yet</div>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Sub-county"><Input value={form.sub_county} onChange={(e) => update("sub_county", e.target.value)} /></Field>
                <Field label="Parish"><Input value={form.parish} onChange={(e) => update("parish", e.target.value)} /></Field>
                <Field label="Village / area"><Input value={form.village} onChange={(e) => update("village", e.target.value)} /></Field>
                <Field label="Site name *" error={errors.site_name}>
                  <Input value={form.site_name} onChange={(e) => update("site_name", e.target.value)} placeholder="Common local name" />
                </Field>
              </div>

              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="size-4" /> GPS coordinates
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={captureGps} disabled={gpsLoading}>
                    {gpsLoading ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <MapPin className="size-3.5 mr-1" />}
                    {gpsLoading ? "Capturing…" : "Capture GPS now"}
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input value={form.latitude} onChange={(e) => update("latitude", e.target.value)} placeholder="e.g. 0.347596" inputMode="decimal" />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input value={form.longitude} onChange={(e) => update("longitude", e.target.value)} placeholder="e.g. 32.582520" inputMode="decimal" />
                  </div>
                </div>
                {form.gps_accuracy && (
                  <p className="text-xs text-muted-foreground">Accuracy: ±{Math.round(form.gps_accuracy)}m</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} /></Field>
              <Field label="Serial number"><Input value={form.serial_number} onChange={(e) => update("serial_number", e.target.value)} /></Field>
              <Field label="Year of manufacture" error={errors.year_manufactured}>
                <Input type="number" min={1950} max={new Date().getFullYear()} value={form.year_manufactured} onChange={(e) => update("year_manufactured", e.target.value)} />
              </Field>
              <Field label="UEDCL internal reference"><Input value={form.uedcl_reference} onChange={(e) => update("uedcl_reference", e.target.value)} /></Field>
              <Field label="Installation date"><Input type="date" value={form.install_date} onChange={(e) => update("install_date", e.target.value)} /></Field>
              <Field label="Installing contractor / team"><Input value={form.installing_contractor} onChange={(e) => update("installing_contractor", e.target.value)} /></Field>
              <Field label="Commissioned by"><Input value={form.commissioned_by} onChange={(e) => update("commissioned_by", e.target.value)} /></Field>
              <Field label="Commissioning date"><Input type="date" value={form.commissioning_date} onChange={(e) => update("commissioning_date", e.target.value)} /></Field>
              <Field label="Warranty expiry"><Input type="date" value={form.warranty_expiry} onChange={(e) => update("warranty_expiry", e.target.value)} /></Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {PHOTO_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">{cat.label}</Label>
                    <p className="text-xs text-muted-foreground">{cat.hint}</p>
                  </div>
                  <label className="block border border-dashed rounded-md p-4 cursor-pointer hover:bg-muted/40 transition">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImagePlus className="size-4" /> Add photos
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => onPickPhotos(cat.id, e.target.files)} />
                  </label>
                  {photos[cat.id].length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {photos[cat.id].map((f, idx) => (
                        <div key={idx} className="relative">
                          <img src={URL.createObjectURL(f)} alt="" className="size-20 rounded-md object-cover border" />
                          <button type="button"
                            onClick={() => removePhoto(cat.id, idx)}
                            className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Photos are compressed locally before upload.</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t mt-2">
            <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={checkDupAndSubmit} disabled={submitting}>
                {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {submitting ? "Saving…" : "Register transformer"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Possible duplicate serial number</DialogTitle>
            <DialogDescription>
              Transformer <span className="font-mono font-semibold">{dupAsset}</span> already
              uses this serial number. Please verify this is not a duplicate before continuing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDupOpen(false); pendingSubmit?.(); }}>Proceed anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SimpleSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function stepErrors(step: number, f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!f.network_voltage_kv) e.network_voltage_kv = "Required";
    if (!f.kva_rating) e.kva_rating = "Required";
  }
  if (step === 1) {
    if (!f.territory_id) e.territory_id = "Required";
    if (!f.service_area_id) e.service_area_id = "Required";
    if (!f.site_name.trim()) e.site_name = "Required";
  }
  if (step === 2) {
    if (f.year_manufactured) {
      const y = Number(f.year_manufactured);
      const now = new Date().getFullYear();
      if (!Number.isInteger(y) || y < 1950 || y > now) {
        e.year_manufactured = `Must be between 1950 and ${now}`;
      }
    }
  }
  return e;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}
