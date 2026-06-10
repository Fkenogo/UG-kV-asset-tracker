import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Filter, Layers, MapPin, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  OPERATIONAL_STATUS_LABELS,
  NETWORK_VOLTAGES,
  type OperationalStatus,
  type NetworkVoltage,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapView,
});

// Uganda — UEDCL service area centroid.
const UGANDA_CENTER: [number, number] = [1.3733, 32.2903];
const STATUSES: OperationalStatus[] = [
  "active",
  "faulty",
  "under_maintenance",
  "decommissioned",
  "unverified",
];

// Status → hex used in the SVG pin so we get one cached icon per status.
const STATUS_COLORS: Record<OperationalStatus, string> = {
  active: "#16a34a",
  faulty: "#dc2626",
  under_maintenance: "#f59e0b",
  decommissioned: "#6b7280",
  unverified: "#3b82f6",
};

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(status: OperationalStatus): L.DivIcon {
  const cached = iconCache.get(status);
  if (cached) return cached;
  const color = STATUS_COLORS[status];
  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.2 21.1 13.2 22a1.2 1.2 0 0 0 1.6 0C15.8 35.1 28 23.5 28 14 28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`;
  const icon = L.divIcon({
    html,
    className: "kvat-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
  iconCache.set(status, icon);
  return icon;
}

interface TransformerPin {
  id: string;
  asset_id: string;
  serial_number: string | null;
  site_name: string | null;
  capacity_kva: number;
  network_voltage_kv: number;
  operational_status: OperationalStatus;
  latitude: number;
  longitude: number;
}

interface Filters {
  statuses: Set<OperationalStatus>;
  voltage: NetworkVoltage | "all";
  territoryId: string | "all";
}

function MapView() {
  const [filters, setFilters] = useState<Filters>({
    statuses: new Set<OperationalStatus>(STATUSES),
    voltage: "all",
    territoryId: "all",
  });
  const [tile, setTile] = useState<"streets" | "satellite">("streets");

  const territoriesQuery = useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_territories")
        .select("id, code, name")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const transformersQuery = useQuery({
    queryKey: ["map-transformers", filters.voltage, filters.territoryId],
    queryFn: async () => {
      let q = supabase
        .from("transformers")
        .select(
          "id, asset_id, serial_number, site_name, capacity_kva, network_voltage_kv, operational_status, latitude, longitude, territory_id",
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(2000);
      if (filters.voltage !== "all") q = q.eq("network_voltage_kv", filters.voltage);
      if (filters.territoryId !== "all") q = q.eq("territory_id", filters.territoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TransformerPin[];
    },
  });

  const visible = useMemo(
    () =>
      (transformersQuery.data ?? []).filter((t) =>
        filters.statuses.has(t.operational_status),
      ),
    [transformersQuery.data, filters.statuses],
  );

  const counts = useMemo(() => {
    const c: Record<OperationalStatus, number> = {
      active: 0,
      faulty: 0,
      under_maintenance: 0,
      decommissioned: 0,
      unverified: 0,
    };
    for (const t of transformersQuery.data ?? []) c[t.operational_status]++;
    return c;
  }, [transformersQuery.data]);

  function toggleStatus(s: OperationalStatus) {
    setFilters((f) => {
      const next = new Set(f.statuses);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return { ...f, statuses: next };
    });
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full">
      <MapContainer
        center={UGANDA_CENTER}
        zoom={7}
        scrollWheelZoom
        className="h-full w-full"
      >
        {tile === "streets" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <FitToMarkers points={visible} />

        {visible.map((t) => (
          <Marker
            key={t.id}
            position={[t.latitude, t.longitude]}
            icon={pinIcon(t.operational_status)}
          >
            <Popup>
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold">{t.asset_id}</div>
                <div className="text-xs text-muted-foreground">
                  {t.site_name ?? "Unnamed site"}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline">
                    {t.capacity_kva}kVA/{t.network_voltage_kv}kV
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: STATUS_COLORS[t.operational_status],
                      color: "white",
                    }}
                  >
                    {OPERATIONAL_STATUS_LABELS[t.operational_status]}
                  </Badge>
                </div>
                {t.serial_number && (
                  <div className="text-xs">SN: {t.serial_number}</div>
                )}
                <Link
                  to="/transformers/$id"
                  params={{ id: t.id }}
                  className="block pt-1 text-primary underline text-xs"
                >
                  Open profile →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top-left overlay: counts + controls */}
      <div className="absolute top-3 left-3 z-[1000] space-y-2 max-w-[calc(100%-1.5rem)]">
        <div className="bg-card/95 backdrop-blur border rounded-md shadow-md px-3 py-2 flex items-center gap-3">
          <MapPin className="size-4 text-accent" />
          <div className="text-sm">
            <span className="font-semibold">{visible.length}</span>
            <span className="text-muted-foreground"> of {transformersQuery.data?.length ?? 0} shown</span>
          </div>
          {transformersQuery.isFetching && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary" className="shadow">
                <Filter className="size-3.5" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <div className="mt-1.5 space-y-1.5">
                  {STATUSES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={filters.statuses.has(s)}
                        onCheckedChange={() => toggleStatus(s)}
                      />
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[s] }}
                      />
                      <span className="flex-1">{OPERATIONAL_STATUS_LABELS[s]}</span>
                      <span className="text-xs text-muted-foreground">{counts[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Voltage
                </Label>
                <Select
                  value={String(filters.voltage)}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      voltage: v === "all" ? "all" : (Number(v) as NetworkVoltage),
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All voltages</SelectItem>
                    {NETWORK_VOLTAGES.map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        {v}kV
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Territory
                </Label>
                <Select
                  value={filters.territoryId}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, territoryId: v }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All territories</SelectItem>
                    {(territoriesQuery.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(filters.voltage !== "all" ||
                filters.territoryId !== "all" ||
                filters.statuses.size !== STATUSES.length) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() =>
                    setFilters({
                      statuses: new Set(STATUSES),
                      voltage: "all",
                      territoryId: "all",
                    })
                  }
                >
                  <X className="size-3.5" />
                  Reset filters
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="secondary"
            className="shadow"
            onClick={() => setTile((t) => (t === "streets" ? "satellite" : "streets"))}
          >
            <Layers className="size-3.5" />
            {tile === "streets" ? "Satellite" : "Streets"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!transformersQuery.isLoading && (transformersQuery.data?.length ?? 0) === 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="bg-card/95 backdrop-blur border rounded-md shadow-md p-6 text-center max-w-sm pointer-events-auto">
            <MapPin className="size-8 mx-auto text-muted-foreground mb-2" />
            <div className="font-semibold">No transformers with GPS coordinates</div>
            <div className="text-sm text-muted-foreground mt-1">
              Register transformers with location data to see them on the map.
            </div>
            <Link to="/transformers/new" className="inline-block mt-3">
              <Button size="sm">Register transformer</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Fit the map viewport to the loaded markers when they change. */
function FitToMarkers({ points }: { points: TransformerPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}
