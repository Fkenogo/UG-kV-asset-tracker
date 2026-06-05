// RBAC permission matrix — mirrors PRD §02.
// canDo() is the single source of truth for UI gating.
// RLS policies in the database are the enforcement layer.
import type { Role } from "@/types";

export type Action =
  // Asset registry
  | "view_all_transformers"
  | "view_territory_transformers"
  | "add_transformer"
  | "edit_transformer"
  | "delete_transformer"
  // Field activity
  | "log_inspection"
  | "log_maintenance"
  | "report_fault"
  | "assign_fault"
  | "resolve_fault"
  | "log_installation"
  | "log_replacement"
  // QR
  | "generate_qr"
  | "scan_qr"
  // Dashboard & reports
  | "view_dashboard"
  | "view_reports"
  | "export_data"
  // Admin
  | "manage_users"
  | "bulk_import"
  | "manage_settings";

type Scope = "all" | "own_territory" | "assigned_area" | false;

const MATRIX: Record<Action, Record<Role, Scope>> = {
  view_all_transformers: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: "assigned_area",
    viewer: "all",
  },
  view_territory_transformers: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: "assigned_area",
    viewer: "all",
  },
  add_transformer: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  edit_transformer: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: false,
    viewer: false,
  },
  delete_transformer: {
    super_admin: "all",
    territory_manager: false,
    engineer: false,
    field_technician: false,
    viewer: false,
  },
  log_inspection: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  log_maintenance: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  report_fault: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  assign_fault: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: false,
    viewer: false,
  },
  resolve_fault: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  log_installation: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: false,
  },
  log_replacement: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: false,
    viewer: false,
  },
  generate_qr: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: false,
    viewer: false,
  },
  scan_qr: {
    super_admin: "all",
    territory_manager: "all",
    engineer: "all",
    field_technician: "all",
    viewer: "all",
  },
  view_dashboard: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: false,
    viewer: "all",
  },
  view_reports: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: false,
    viewer: "all",
  },
  export_data: {
    super_admin: "all",
    territory_manager: "own_territory",
    engineer: "all",
    field_technician: false,
    viewer: false,
  },
  manage_users: {
    super_admin: "all",
    territory_manager: false,
    engineer: false,
    field_technician: false,
    viewer: false,
  },
  bulk_import: {
    super_admin: "all",
    territory_manager: false,
    engineer: false,
    field_technician: false,
    viewer: false,
  },
  manage_settings: {
    super_admin: "all",
    territory_manager: false,
    engineer: false,
    field_technician: false,
    viewer: false,
  },
};

/** True if the role may perform the action at all (any scope). */
export function canDo(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[action]?.[role] !== false;
}

/** Returns the scope at which the role can perform the action, or false. */
export function scopeFor(role: Role | null | undefined, action: Action): Scope {
  if (!role) return false;
  return MATRIX[action]?.[role] ?? false;
}

export function canDoAny(role: Role | null | undefined, actions: Action[]): boolean {
  return actions.some((a) => canDo(role, a));
}
