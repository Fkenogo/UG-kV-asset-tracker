import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, ClipboardCheck, MapPin, ShieldAlert, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransformerQR } from "@/components/TransformerQR";
import { OPERATIONAL_STATUS_LABELS, type OperationalStatus } from "@/types";

function transformerQuery(id: string) {
  return queryOptions({
    queryKey: ["transformer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformers")
        .select(
          `*,
           territory:service_territories(id,name,code),
           service_area:service_areas(id,name),
           feeder:feeders(id,name,code),
           district:districts(id,name)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Transformer not found");
      return data;
    },
  });
}

export const Route = createFileRoute("/_authenticated/transformers/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(transformerQuery(params.id)),
  component: TransformerProfile,
  errorComponent: ({ error }) => (
    <div className="p-8 max-w-2xl mx-auto">
      <p className="text-sm text-destructive">{error.message}</p>
      <Button asChild variant="link" className="px-0 mt-2">
        <Link to="/transformers">← Back to list</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Transformer not found.</div>,
});

function timelineQuery(id: string) {
  return queryOptions({
    queryKey: ["transformer-timeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_timeline")
        .select("id, event_type, event_summary, created_at")
        .eq("transformer_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function TransformerProfile() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const { data: t } = useSuspenseQuery(transformerQuery(id));
  const { data: timeline = [] } = useQuery(timelineQuery(id));
  const status = (t.operational_status ?? "unverified") as OperationalStatus;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/transformers">
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
      </div>


      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t.asset_id}
          </div>
          <h1 className="text-2xl font-semibold mt-1">{t.site_name ?? "Unnamed site"}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={
                t.network_voltage_kv === 33
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-accent/10 text-accent border-accent/30"
              }
            >
              {t.kva_rating}kVA / {t.network_voltage_kv}kV
            </Badge>
            <StatusBadge status={status} />
            {t.has_open_fault && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                <AlertTriangle className="size-3 mr-1" /> Open fault
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {canDo(role, "log_inspection") && (
          <Button asChild size="sm" variant="outline">
            <Link to="/inspections/new" search={{ transformerId: t.id }}>
              <ClipboardCheck className="size-4 mr-1.5" /> Log inspection
            </Link>
          </Button>
        )}
        {canDo(role, "report_fault") && (
          <Button asChild size="sm" variant="outline">
            <Link to="/faults/new" search={{ transformerId: t.id }}>
              <ShieldAlert className="size-4 mr-1.5" /> Report fault
            </Link>
          </Button>
        )}
        {canDo(role, "log_maintenance") && (
          <Button asChild size="sm" variant="outline">
            <Link to="/maintenance/new" search={{ transformerId: t.id }}>
              <Wrench className="size-4 mr-1.5" /> Log maintenance
            </Link>
          </Button>
        )}
      </div>


      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identification</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Manufacturer" value={t.manufacturer} />
            <Row label="Serial number" value={t.serial_number} />
            <Row label="Year manufactured" value={t.year_manufactured} />
            <Row label="UEDCL reference" value={t.uedcl_reference} />
            <Row label="Vector group" value={t.vector_group} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Technical</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Secondary voltage" value={t.voltage_secondary} />
            <Row label="Phase" value={t.phase_type} />
            <Row label="Cooling" value={t.cooling_type} />
            <Row label="Mounting" value={t.mounting_type} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Territory" value={(t.territory as { name?: string } | null)?.name} />
            <Row label="Service area" value={(t.service_area as { name?: string } | null)?.name} />
            <Row label="Feeder" value={(t.feeder as { name?: string } | null)?.name} />
            <Row label="District" value={(t.district as { name?: string } | null)?.name} />
            <Row label="Sub-county" value={t.sub_county} />
            <Row label="Parish" value={t.parish} />
            <Row label="Village" value={t.village} />
            {t.latitude && t.longitude && (
              <div className="flex items-center gap-1.5 pt-1 text-muted-foreground">
                <MapPin className="size-3.5" />
                <span className="font-mono text-xs">{Number(t.latitude).toFixed(6)}, {Number(t.longitude).toFixed(6)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Installation</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Installed" value={t.install_date} />
            <Row label="Contractor" value={t.installing_contractor} />
            <Row label="Commissioned by" value={t.commissioned_by} />
            <Row label="Commissioning date" value={t.commissioning_date} />
            <Row label="Warranty expiry" value={t.warranty_expiry} />
          </CardContent>
        </Card>
      </div>

      <TransformerQR
        transformerId={t.id}
        assetId={t.asset_id ?? ""}
        siteName={t.site_name}
        kvaRating={t.kva_rating ?? 0}
        voltageKv={t.network_voltage_kv ?? 0}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {timeline.length === 0 ? (
            <p className="text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((evt) => (
                <li key={evt.id} className="flex gap-3 items-start">
                  <div className="mt-1 size-2 rounded-full bg-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{evt.event_summary}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {evt.event_type.replace(/_/g, " ")} ·{" "}
                      {new Date(evt.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function StatusBadge({ status }: { status: OperationalStatus }) {
  const tone: Record<OperationalStatus, string> = {
    active: "bg-success/10 text-success border-success/30",
    faulty: "bg-destructive/10 text-destructive border-destructive/30",
    under_maintenance: "bg-accent/10 text-accent border-accent/30",
    decommissioned: "bg-muted text-muted-foreground border-muted",
    unverified: "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <Badge variant="outline" className={tone[status]}>
      {OPERATIONAL_STATUS_LABELS[status]}
    </Badge>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ? String(value) : "—"}</span>
    </div>
  );
}
