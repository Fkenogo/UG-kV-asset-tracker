import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import {
  KVA_OPTIONS,
  OPERATIONAL_STATUS_LABELS,
  type OperationalStatus,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PAGE_SIZE = 25;
const STATUSES: OperationalStatus[] = [
  "active",
  "faulty",
  "under_maintenance",
  "decommissioned",
  "unverified",
];

const territoriesQO = queryOptions({
  queryKey: ["service_territories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("service_territories")
      .select("id, name, code")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/_authenticated/transformers/")({
  head: () => ({
    meta: [{ title: "Transformers — kVAssetTracker" }],
  }),
  component: TransformersList,
});

function TransformersList() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const canAdd = canDo(role, "add_transformer");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [debounced]);

  const [territoryId, setTerritoryId] = useState<string | "all">("all");
  const [voltage, setVoltage] = useState<"all" | "11" | "33">("all");
  const [kvaSel, setKvaSel] = useState<Set<number>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<OperationalStatus>>(new Set());
  const [openFault, setOpenFault] = useState<"all" | "yes" | "no">("all");

  useEffect(() => setPage(0), [territoryId, voltage, kvaSel, statusSel, openFault]);

  const activeFilters =
    (territoryId !== "all" ? 1 : 0) +
    (voltage !== "all" ? 1 : 0) +
    (kvaSel.size > 0 ? 1 : 0) +
    (statusSel.size > 0 ? 1 : 0) +
    (openFault !== "all" ? 1 : 0);

  const territoriesQ = useQuery(territoriesQO);

  const listQuery = useQuery({
    queryKey: [
      "transformers",
      debounced,
      territoryId,
      voltage,
      Array.from(kvaSel).sort(),
      Array.from(statusSel).sort(),
      openFault,
      page,
    ],
    queryFn: async () => {
      let q = supabase
        .from("transformers")
        .select(
          `id, asset_id, site_name, kva_rating, network_voltage_kv,
           operational_status, has_open_fault, last_inspection_date,
           territory:service_territories(name),
           service_area:service_areas(name)`,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (debounced) {
        const like = `%${debounced}%`;
        q = q.or(
          `asset_id.ilike.${like},serial_number.ilike.${like},site_name.ilike.${like},uedcl_reference.ilike.${like}`,
        );
      }
      if (territoryId !== "all") q = q.eq("territory_id", territoryId);
      if (voltage !== "all") q = q.eq("network_voltage_kv", Number(voltage));
      if (kvaSel.size > 0) q = q.in("kva_rating", Array.from(kvaSel));
      if (statusSel.size > 0) q = q.in("operational_status", Array.from(statusSel));
      if (openFault !== "all") q = q.eq("has_open_fault", openFault === "yes");

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const total = listQuery.data?.total ?? 0;
  const rows = listQuery.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = () => {
    setTerritoryId("all");
    setVoltage("all");
    setKvaSel(new Set());
    setStatusSel(new Set());
    setOpenFault("all");
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transformer registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {listQuery.isLoading
              ? "Loading…"
              : `Showing ${rows.length} of ${total.toLocaleString()} transformers`}
          </p>
        </div>
        {canAdd && (
          <Button asChild>
            <Link to="/transformers/new">
              <Plus className="size-4 mr-1.5" /> Add transformer
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by asset ID, serial, site, or UEDCL reference"
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="size-4" />
                  Filters
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4 space-y-4" align="end">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <SlidersHorizontal className="size-4" /> Refine
                  </div>
                  {activeFilters > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="size-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Territory</Label>
                  <Select value={territoryId} onValueChange={(v) => setTerritoryId(v as string)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All territories</SelectItem>
                      {(territoriesQ.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Network voltage</Label>
                  <div className="flex gap-1">
                    {(["all", "11", "33"] as const).map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={voltage === v ? "default" : "outline"}
                        onClick={() => setVoltage(v)}
                        className="flex-1"
                      >
                        {v === "all" ? "All" : `${v}kV`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">kVA rating</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {KVA_OPTIONS.map((k) => {
                      const checked = kvaSel.has(k);
                      return (
                        <label key={k} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              const next = new Set(kvaSel);
                              checked ? next.delete(k) : next.add(k);
                              setKvaSel(next);
                            }}
                          />
                          {k}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <div className="space-y-1.5">
                    {STATUSES.map((s) => {
                      const checked = statusSel.has(s);
                      return (
                        <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              const next = new Set(statusSel);
                              checked ? next.delete(s) : next.add(s);
                              setStatusSel(next);
                            }}
                          />
                          {OPERATIONAL_STATUS_LABELS[s]}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Has open fault</Label>
                  <div className="flex gap-1">
                    {(["all", "yes", "no"] as const).map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={openFault === v ? "default" : "outline"}
                        onClick={() => setOpenFault(v)}
                        className="flex-1 capitalize"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Service area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last inspection</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">Loading…</TableCell></TableRow>
                )}
                {!listQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      No transformers match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const status = (r.operational_status ?? "unverified") as OperationalStatus;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate({ to: "/transformers/$id", params: { id: r.id } })}
                    >
                      <TableCell className="font-mono font-semibold text-xs">{r.asset_id}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.network_voltage_kv === 33
                              ? "bg-primary/10 text-primary border-primary/30 whitespace-nowrap"
                              : "bg-accent/10 text-accent border-accent/30 whitespace-nowrap"
                          }
                        >
                          {r.kva_rating}kVA / {r.network_voltage_kv}kV
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.site_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{(r.territory as { name?: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{(r.service_area as { name?: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell><StatusPill status={status} /></TableCell>
                      <TableCell className="text-sm">
                        {r.last_inspection_date ? (
                          new Date(r.last_inspection_date).toLocaleDateString()
                        ) : (
                          <span className="text-destructive">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.has_open_fault && <AlertTriangle className="size-4 text-destructive" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: OperationalStatus }) {
  const tone: Record<OperationalStatus, string> = {
    active: "bg-success/10 text-success border-success/30",
    faulty: "bg-destructive/10 text-destructive border-destructive/30",
    under_maintenance: "bg-accent/10 text-accent border-accent/30",
    decommissioned: "bg-muted text-muted-foreground border-muted",
    unverified: "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <Badge variant="outline" className={`${tone[status]} whitespace-nowrap`}>
      {OPERATIONAL_STATUS_LABELS[status]}
    </Badge>
  );
}
