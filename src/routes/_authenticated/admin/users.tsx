import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, KeyRound, UserCog } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canDo } from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/types";
import {
  listAdminUsers,
  inviteAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
} from "@/lib/api/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  territory_id: string | null;
  service_area_id: string | null;
  is_active: boolean;
  created_at: string;
  roles: string[];
};

const ROLES: Role[] = ["super_admin", "territory_manager", "engineer", "field_technician", "viewer"];

function AdminUsersPage() {
  const { role } = useAuth();
  const router = useRouter();
  const list = useServerFn(listAdminUsers);
  const invite = useServerFn(inviteAdminUser);
  const update = useServerFn(updateAdminUser);
  const reset = useServerFn(resetAdminUserPassword);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
    enabled: canDo(role, "manage_users"),
  });

  const territoriesQuery = useQuery({
    queryKey: ["service-territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_territories")
        .select("id,name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const inviteMut = useMutation({
    mutationFn: async (vars: Parameters<typeof invite>[0]["data"]) => invite({ data: vars }),
    onSuccess: (res, vars) => {
      usersQuery.refetch();
      setInviteOpen(false);
      if (res.temporary_password) {
        setCredential({ email: vars.email, password: res.temporary_password });
      } else {
        toast.success(`Invited ${vars.email}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (vars: Parameters<typeof update>[0]["data"]) => update({ data: vars }),
    onSuccess: () => {
      toast.success("User updated");
      usersQuery.refetch();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: async (user_id: string) => reset({ data: { user_id } }),
    onSuccess: (res, user_id) => {
      const u = usersQuery.data?.find((x) => x.id === user_id);
      setCredential({ email: u?.email ?? "", password: res.temporary_password });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canDo(role, "manage_users")) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">You don't have access to user management.</p>
      </div>
    );
  }

  const users = (usersQuery.data ?? []) as AdminUser[];

  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite team members and assign roles, territories, and activation.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="size-4 mr-1.5" /> Invite user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{users.length} user{users.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{u.full_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4">
                        {u.roles[0] ? (
                          <Badge variant="outline">{ROLE_LABELS[u.roles[0] as Role] ?? u.roles[0]}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {u.is_active ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                            <UserCog className="size-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resetMut.isPending}
                            onClick={() => resetMut.mutate(u.id)}
                          >
                            <KeyRound className="size-4 mr-1" /> Reset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        territories={territoriesQuery.data ?? []}
        pending={inviteMut.isPending}
        onSubmit={(v) => inviteMut.mutate(v)}
      />

      <EditDialog
        user={editing}
        onClose={() => setEditing(null)}
        territories={territoriesQuery.data ?? []}
        pending={updateMut.isPending}
        onSubmit={(v) => updateMut.mutate(v)}
      />

      <Dialog open={!!credential} onOpenChange={(o) => !o && (setCredential(null), router.invalidate())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password generated</DialogTitle>
            <DialogDescription>
              Share this with <span className="font-medium">{credential?.email}</span>. It won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">{credential?.password}</div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (credential) navigator.clipboard.writeText(credential.password);
                toast.success("Copied to clipboard");
              }}
            >
              Copy password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  territories,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  territories: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (v: {
    email: string;
    full_name: string;
    role: Role;
    territory_id: string | null;
  }) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [territoryId, setTerritoryId] = useState<string>("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      email,
      full_name: fullName,
      role,
      territory_id: territoryId || null,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setEmail("");
          setFullName("");
          setRole("viewer");
          setTerritoryId("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            Creates an account with a temporary password you can share.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="iv-name">Full name</Label>
            <Input id="iv-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="iv-email">Email</Label>
            <Input id="iv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Territory (optional)</Label>
            <Select value={territoryId || "none"} onValueChange={(v) => setTerritoryId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  user,
  onClose,
  territories,
  pending,
  onSubmit,
}: {
  user: AdminUser | null;
  onClose: () => void;
  territories: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (v: {
    user_id: string;
    full_name: string;
    role: Role;
    territory_id: string | null;
    is_active: boolean;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [territoryId, setTerritoryId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  // Reset state when a new user is selected
  const userKey = user?.id ?? "";
  const [lastKey, setLastKey] = useState("");
  if (userKey !== lastKey) {
    setLastKey(userKey);
    if (user) {
      setFullName(user.full_name ?? "");
      setRole((user.roles[0] as Role) ?? "viewer");
      setTerritoryId(user.territory_id ?? "");
      setIsActive(user.is_active);
    }
  }

  if (!user) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      user_id: user!.id,
      full_name: fullName,
      role,
      territory_id: territoryId || null,
      is_active: isActive,
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="eu-name">Full name</Label>
            <Input id="eu-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Territory</Label>
            <Select value={territoryId || "none"} onValueChange={(v) => setTerritoryId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">Inactive users can't sign in.</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
