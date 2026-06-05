import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  QrCode,
  ShieldAlert,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { canDo, type Action } from "@/lib/permissions";
import { ROLE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  requires?: Action;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requires: "view_dashboard" },
  { to: "/transformers", label: "Transformers", icon: Zap },
  { to: "/map", label: "Map", icon: Map },
  { to: "/qr-scan", label: "Scan QR", icon: QrCode, requires: "scan_qr" },
  { to: "/faults", label: "Faults", icon: ShieldAlert, requires: "report_fault" },
  { to: "/inspections", label: "Inspections", icon: ClipboardCheck, requires: "log_inspection" },
  { to: "/reports", label: "Reports", icon: FileBarChart2, requires: "view_reports" },
  { to: "/admin/users", label: "Users", icon: Users, requires: "manage_users" },
  { to: "/admin/import", label: "Bulk import", icon: Upload, requires: "bulk_import" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV.filter((i) => !i.requires || canDo(role, i.requires));

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Brand />
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {items.map((item) => (
            <SideLink key={item.to} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="px-3 py-3 text-[11px] text-sidebar-foreground/60 border-t border-sidebar-border">
          UEDCL · kVAssetTracker
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <button
                className="p-2 text-sidebar-foreground/70"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {items.map((item) => (
                <SideLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-card border-b flex items-center gap-2 px-3 md:px-5">
          <button
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="md:hidden flex items-center gap-1.5">
            <Zap className="size-4 text-accent" />
            <span className="font-semibold tracking-tight">kVAssetTracker</span>
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <div className="size-7 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-semibold">
                {(user?.profile?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-sm font-medium">
                  {user?.profile?.full_name ?? user?.email}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {role ? ROLE_LABELS[role] : "No role assigned"}
                </div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-md border bg-popover text-popover-foreground shadow-md p-1"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="h-14 px-4 flex items-center gap-2 border-b border-sidebar-border">
      <div className="grid place-items-center size-8 rounded-md bg-accent text-accent-foreground">
        <Zap className="size-4" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-sm tracking-tight">kVAssetTracker</div>
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
          UEDCL
        </div>
      </div>
    </div>
  );
}

function SideLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  return (
    <a
      href={item.to}
      onClick={(e) => {
        if (onClick) onClick();
        // Let TanStack handle navigation via full-page request fallback for stubs.
      }}
      data-active={active}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4" />
      <span>{item.label}</span>
    </a>
  );
}
