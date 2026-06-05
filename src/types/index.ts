// kVAssetTracker — shared types & enums.
// Network voltage is a CORE business distinction (11kV vs 33kV are different assets).

export type Role =
  | "super_admin"
  | "territory_manager"
  | "engineer"
  | "field_technician"
  | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  territory_manager: "Territory Manager",
  engineer: "Engineer",
  field_technician: "Field Technician",
  viewer: "Viewer",
};

export type NetworkVoltage = 11 | 33;

export const NETWORK_VOLTAGES: NetworkVoltage[] = [11, 33];

export const KVA_OPTIONS: number[] = [50, 100, 160, 200, 250, 315, 500, 630, 1000];

export type OperationalStatus =
  | "active"
  | "faulty"
  | "under_maintenance"
  | "decommissioned"
  | "unverified";

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  active: "Active",
  faulty: "Faulty",
  under_maintenance: "Under Maintenance",
  decommissioned: "Decommissioned",
  unverified: "Unverified",
};

export type FaultSeverity = "minor" | "major" | "critical" | "complete_outage";

export type FaultStatus = "open" | "assigned" | "in_progress" | "resolved";

export type PhaseType = "single_phase" | "three_phase";

export type CoolingType = "ONAN" | "ONAF" | "OFAF";

export type MountingType = "pole_mounted" | "plinth" | "ground" | "indoor_substation";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  territory_id: string | null;
  service_area_id: string | null;
  is_active: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: Role[];
  primaryRole: Role | null;
}

/** Compose the display rating used everywhere: e.g. "315kVA/11kV". */
export function ratingLabel(kva: number, voltage: NetworkVoltage): string {
  return `${kva}kVA/${voltage}kV`;
}
