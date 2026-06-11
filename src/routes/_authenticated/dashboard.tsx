import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  MapPin,
  ShieldAlert,
  Wrench,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/types";
import { canDo } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — kVAssetTracker" },
      { name: "description", content: "Live overview of the UEDCL transformer fleet." },
    ],
  }),
  component: DashboardPage,
});

function kpiQuery() {
  return queryOptions({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const counts = async (build: (q: ReturnType<typeof supabase.from>) => unknown) => {
        const q = supabase.from("transformers").select("id", { count: "exact", head: true });
        const res = await (build(q) as Promise<{ count: number | null; error: unknown }>);
        return res.count ?? 0;
      };
      const total = await counts((q) => q);
      const active = await counts((q) =>
        (q as ReturnType<typeof supabase.from>).eq("operational_status", "active"),
      );
      const { count: openFaults } = await supabase
        .from("fault_records")
        .select("id", { count: "exact", head: true })
        .in("fault_status", ["open", "assigned", "in_progress"]);
      const { count: recentInspections } = await supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .gte("inspection_date", new Date(Date.now() - 30 * 86_400_000).toISOString());
      return {
        total,
        active,
        openFaults: openFaults ?? 0,
        recentInspections: recentInspections ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

function DashboardPage() {
  const { user, role } = useAuth();
  const { data: kpis } = useQuery(kpiQuery());

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-8">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Operations overview
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
          Welcome{user?.profile?.full_name ? `, ${user.profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {role ? ROLE_LABELS[role] : "no role assigned yet"}
          </span>
          .
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total transformers" value={kpis?.total ?? "—"} hint="11kV + 33kV" tone="primary" />
        <KpiTile label="Active" value={kpis?.active ?? "—"} hint="Operational" tone="success" />
        <KpiTile label="Open faults" value={kpis?.openFaults ?? "—"} hint="Needs attention" tone="warning" />
        <KpiTile label="Inspections (30d)" value={kpis?.recentInspections ?? "—"} hint="Last 30 days" tone="accent" />
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <ActionCard
          to="/transformers"
          icon={Zap}
          title="Asset registry"
          body="Register, search, and edit transformers. Network voltage (11kV / 33kV) drives kVA selection."
          available
        />
        <ActionCard
          to="/map"
          icon={MapPin}
          title="GPS map"
          body="See every transformer on an interactive Uganda map, colour-coded by status."
          available
        />
        <ActionCard
          to="/faults"
          icon={ShieldAlert}
          title="Faults"
          body="Track open and resolved faults. Critical and complete-outage events mark assets faulty."
          available={canDo(role, "report_fault")}
        />
        <ActionCard
          to="/inspections"
          icon={ClipboardCheck}
          title="Inspections"
          body="Live load %, nameplate confirmation, photos — all from your phone, even offline."
          available={canDo(role, "log_inspection")}
        />
        <ActionCard
          to="/maintenance/new"
          icon={Wrench}
          title="Log maintenance"
          body="Record preventive or corrective maintenance work and schedule next service."
          available={canDo(role, "log_maintenance")}
        />
        <ActionCard
          to="/reports"
          icon={AlertTriangle}
          title="Reports & exports"
          body="Excel and PDF exports for district summaries, fault history, and replacement candidates."
          available={canDo(role, "view_reports")}
        />
      </section>
    </div>
  );
}

type Tone = "primary" | "accent" | "warning" | "success" | "muted";

function KpiTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: Tone;
}) {
  const toneClass: Record<Tone, string> = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`text-[10px] rounded-full px-2 py-0.5 ${toneClass[tone]}`}>·</span>
      </div>
      <div className="text-2xl md:text-3xl font-semibold mt-2">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  title,
  body,
  available,
}: {
  to: string;
  icon: typeof Zap;
  title: string;
  body: string;
  available: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <div className="grid place-items-center size-9 rounded-md bg-accent-soft text-accent-soft-foreground">
          <Icon className="size-4" />
        </div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{body}</p>
      <div className="mt-3 text-xs inline-flex items-center gap-1 text-accent">
        {available ? "Open" : "Not available for your role"}
        {available && <ArrowRight className="size-3" />}
      </div>
    </>
  );

  if (!available) {
    return (
      <div className="rounded-xl border bg-card p-4 opacity-70 cursor-not-allowed">{content}</div>
    );
  }
  return (
    <a
      href={to}
      className="block rounded-xl border bg-card p-4 hover:border-accent hover:shadow-sm transition"
    >
      {content}
    </a>
  );
}
