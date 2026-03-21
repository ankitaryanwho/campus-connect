import { useState } from "react";
import { useAdminListUsers, useAdminToggleBan, useAdminChangeRole, useAdminDeleteUser } from "@workspace/api-client-react";
import { useAuthHeaders, formatDate, adminFetch } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Select, Badge, Button, Modal, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Search, UserX, UserCheck, Trash2, Key, ShieldCheck, ShieldOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BADGES = [
  { id: "verified", label: "Verified", icon: "✓", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", desc: "Official verified account" },
  { id: "top_contributor", label: "Top Contributor", icon: "⭐", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", desc: "Most active & helpful user" },
  { id: "campus_leader", label: "Campus Leader", icon: "👑", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", desc: "Student body leader" },
  { id: "expert", label: "Expert", icon: "🛡️", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", desc: "Domain expert / mentor" },
  { id: "ambassador", label: "Ambassador", icon: "🎓", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", desc: "Campus brand ambassador" },
  { id: "staff", label: "Staff", icon: "🔧", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", desc: "Campus staff / faculty" },
];

function BadgeDisplay({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  const b = BADGES.find((b) => b.id === badge);
  if (!b) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${b.color}`}>
      {b.icon} {b.label}
    </span>
  );
}

export default function UsersPage() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useAdminListUsers({ search, role, page, pageSize }, { ...req });

  const toggleBanMut = useAdminToggleBan({ mutation: { onSuccess: () => invalidate("User status updated") } });
  const changeRoleMut = useAdminChangeRole({ mutation: { onSuccess: () => { invalidate("Role updated"); setRoleModalOpen(false); } } });
  const deleteMut = useAdminDeleteUser({ mutation: { onSuccess: () => invalidate("User deleted permanently") } });

  // Role modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  // Badge / Verify modal
  const [isBadgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeUser, setBadgeUser] = useState<any>(null);
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [badgeSaving, setBadgeSaving] = useState(false);

  function invalidate(msg: string) {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    toast({ description: msg });
  }

  const handleToggleBan = (user: any) => {
    if (confirm(`${user.banned ? "Unban" : "Ban"} ${user.name}?`)) {
      toggleBanMut.mutate({ userId: user.id, data: { banned: !user.banned } }, req);
    }
  };

  const handleDelete = (user: any) => {
    if (confirm(`DANGER: Permanently delete ${user.name} and all their data?`)) {
      deleteMut.mutate({ userId: user.id }, req);
    }
  };

  const openRoleModal = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleModalOpen(true);
  };

  const openBadgeModal = (user: any) => {
    setBadgeUser(user);
    setSelectedBadge(user.verificationBadge || "");
    setBadgeModalOpen(true);
  };

  const submitRoleChange = () => {
    if (selectedUser) {
      changeRoleMut.mutate({ userId: selectedUser.id, data: { role: newRole } }, req);
    }
  };

  const saveBadge = async () => {
    if (!badgeUser) return;
    setBadgeSaving(true);
    try {
      const isVerified = selectedBadge !== "";
      await adminFetch(`/users/${badgeUser.id}/verify`, {
        method: "POST",
        body: JSON.stringify({ verified: isVerified, verificationBadge: selectedBadge || null }),
      });
      toast({ description: isVerified ? `${badgeUser.name} verified with ${BADGES.find(b => b.id === selectedBadge)?.label} badge` : "Verification removed" });
      setBadgeModalOpen(false);
      invalidate("");
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setBadgeSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Users Directory</h1>
          <p className="text-muted-foreground text-sm">Manage accounts, roles, verification badges, and access control.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </Card>

      {/* Table */}
      {isLoading ? <PageLoader /> : (
        <Card className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">College</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users?.map((user: any) => (
                  <TableRow key={user.id} className={user.banned ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(user.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-1.5">
                            {user.name}
                            {user.verified && (
                              <span title={user.verificationBadge || "verified"} className="text-blue-400">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" || user.role === "super_admin" ? "default" : user.role === "provider" ? "secondary" : "outline"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{user.college || "N/A"}</TableCell>
                    <TableCell>
                      {user.verificationBadge
                        ? <BadgeDisplay badge={user.verificationBadge} />
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      {user.banned
                        ? <Badge variant="destructive">Banned</Badge>
                        : <Badge variant="success">Active</Badge>
                      }
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Verify / Badge */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBadgeModal(user)}
                          title={user.verified ? "Edit badge" : "Verify user"}
                        >
                          {user.verified
                            ? <ShieldCheck className="w-4 h-4 text-blue-400" />
                            : <ShieldOff className="w-4 h-4 text-muted-foreground hover:text-blue-400" />
                          }
                        </Button>
                        {/* Change Role */}
                        <Button variant="ghost" size="icon" onClick={() => openRoleModal(user)} title="Change Role">
                          <Key className="w-4 h-4 text-amber-400" />
                        </Button>
                        {/* Ban/Unban */}
                        <Button variant="ghost" size="icon" onClick={() => handleToggleBan(user)} title={user.banned ? "Unban" : "Ban"}>
                          {user.banned
                            ? <UserCheck className="w-4 h-4 text-emerald-400" />
                            : <UserX className="w-4 h-4 text-red-400" />
                          }
                        </Button>
                        {/* Delete */}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} title="Delete User">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.users?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {data?.page} of {Math.max(1, Math.ceil((data?.total || 0) / pageSize))} &middot; {data?.total} users
            </span>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data?.users?.length || data.users.length < pageSize}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Change Role Modal */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setRoleModalOpen(false)} title="Change User Role">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Change role for <strong className="text-white">{selectedUser?.name}</strong>.
          </p>
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="provider">Provider</option>
            <option value="admin">Administrator</option>
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRoleChange} isLoading={changeRoleMut.isPending}>Save Role</Button>
          </div>
        </div>
      </Modal>

      {/* Badge / Verification Modal */}
      <Modal isOpen={isBadgeModalOpen} onClose={() => setBadgeModalOpen(false)} title="Assign Verification Badge">
        {badgeUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                {badgeUser.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-white">{badgeUser.name}</div>
                <div className="text-xs text-muted-foreground">{badgeUser.email}</div>
              </div>
              {badgeUser.verified && <Badge variant="default" className="ml-auto">Currently Verified</Badge>}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Select a badge to grant (or none to remove verification):</p>
              <div className="grid grid-cols-2 gap-2">
                {/* No badge option */}
                <button
                  onClick={() => setSelectedBadge("")}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedBadge === "" ? "border-white/40 bg-white/5" : "border-white/10 hover:border-white/20"}`}
                >
                  <div className="text-base mb-1">🚫</div>
                  <div className="text-xs font-medium text-white">No Badge</div>
                  <div className="text-xs text-muted-foreground">Remove verification</div>
                </button>
                {BADGES.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedBadge === badge.id ? `border-current ${badge.color}` : "border-white/10 hover:border-white/20"}`}
                  >
                    <div className="text-base mb-1">{badge.icon}</div>
                    <div className="text-xs font-medium text-white">{badge.label}</div>
                    <div className="text-xs text-muted-foreground">{badge.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedBadge && (
              <div className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${BADGES.find(b => b.id === selectedBadge)?.color}`}>
                <span className="text-lg">{BADGES.find(b => b.id === selectedBadge)?.icon}</span>
                <div>
                  <div className="font-medium">{badgeUser.name} will receive the <strong>{BADGES.find(b => b.id === selectedBadge)?.label}</strong> badge</div>
                  <div className="text-xs opacity-70">{BADGES.find(b => b.id === selectedBadge)?.desc}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <Button variant="ghost" onClick={() => setBadgeModalOpen(false)}>Cancel</Button>
              <Button onClick={saveBadge} isLoading={badgeSaving}>
                {selectedBadge ? "Grant Badge & Verify" : "Remove Verification"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
