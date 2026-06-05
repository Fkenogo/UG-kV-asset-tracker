import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  MapPin,
  ShieldAlert,
  Zap,
} from "lucide-react";

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

function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-8">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Phase 1 · Foundation
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
          Welcome{user?.profile?.full_name ? `, ${user.profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {role ? ROLE_LABELS[role] : "no role assigned yet"}
          </span>
          . Your dashboard, fleet view, and field forms will appear here as later phases ship.
        </p>
      </header>

      {/* Placeholder KPI strip — real data lands in Phase 7 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total transformers" value="—" hint="11kV + 33kV" tone="primary" />
        <KpiTile label="Active" value="—" hint="No open fault" tone="success" />
        <KpiTile label="Open faults" value="—" hint="Critical highlighted" tone="warning" />
        <KpiTile label="Overdue inspections" value="—" hint="90+ days" tone="muted" />
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
          available={false}
        />
        <ActionCard
          to="/faults"
          icon={ShieldAlert}
          title="Report a fault"
          body="Log a new fault. Critical and complete-outage events notify managers immediately."
          available={canDo(role, "report_fault")}
        />
        <ActionCard
          to="/inspections"
          icon={ClipboardCheck}
          title="Log an inspection"
          body="Live load %, nameplate confirmation, photos — all from your phone, even offline."
          available={canDo(role, "log_inspection")}
        />
        <ActionCard
          to="/reports"
          icon={AlertTriangle}
          title="Reports & exports"
          body="Excel and PDF exports for district summaries, fault history, and replacement candidates."
          available={canDo(role, "view_reports")}
        />
      </section>

      <section className="rounded-xl border bg-accent-soft/60 text-accent-soft-foreground p-5">
        <h2 className="font-semibold tracking-tight">What ships next</h2>
        <ul className="text-sm mt-2 space-y-1.5 list-disc list-inside marker:text-accent">
          <li>
            <span className="font-medium">Phase 2 — Database schema</span>: transformers, ratings,
            faults, timeline, photos and notifications, with row-level security.
          </li>
          <li>
            <span className="font-medium">Phase 3 — Registration & list</span>: the 4-step
            transformer wizard and the filterable asset list.
          </li>
          <li>
            <span className="font-medium">Phase 4 — Map</span>: clustered, status-coloured markers
            across Uganda.
          </li>
        </ul>
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
  value: string;
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
        {available ? "Open" : "Coming soon"}
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
    <Link
      to={to}
      className="block rounded-xl border bg-card p-4 hover:border-accent hover:shadow-sm transition"
    >
      {content}
    </Link>
  );
}
