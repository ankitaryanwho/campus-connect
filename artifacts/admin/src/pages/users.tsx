import { useState } from "react";
import { useAdminListUsers, useAdminToggleBan, useAdminChangeRole, useAdminDeleteUser, useAdminGetUser } from "@workspace/api-client-react";
import { useAuthHeaders, formatDate } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Select, Badge, Button, Modal, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Search, MoreVertical, ShieldAlert, UserX, UserCheck, Trash2, Key } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function UsersPage() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useAdminListUsers({ search, role, page, pageSize }, { ...req });
  
  const toggleBanMut = useAdminToggleBan({ mutation: { onSuccess: () => invalidateAndToast("User status updated") }});
  const changeRoleMut = useAdminChangeRole({ mutation: { onSuccess: () => invalidateAndToast("Role updated successfully") }});
  const deleteMut = useAdminDeleteUser({ mutation: { onSuccess: () => invalidateAndToast("User deleted permanently") }});

  // Action states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  function invalidateAndToast(msg: string) {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    toast({ description: msg });
    setRoleModalOpen(false);
  }

  const handleToggleBan = (user: any) => {
    if (confirm(`Are you sure you want to ${user.banned ? 'unban' : 'ban'} ${user.name}?`)) {
      toggleBanMut.mutate({ userId: user.id, data: { banned: !user.banned } }, req);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("DANGER: This will permanently delete the user and all their data. Proceed?")) {
      deleteMut.mutate({ userId: id }, req);
    }
  };

  const openRoleModal = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleModalOpen(true);
  };

  const submitRoleChange = () => {
    if (selectedUser) {
      changeRoleMut.mutate({ userId: selectedUser.id, data: { role: newRole } }, req);
    }
  };

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Users Directory</h1>
          <p className="text-muted-foreground">Manage accounts, roles, and access.</p>
        </div>
      </div>

      <Card className="glass-panel p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </Card>

      {isLoading ? <PageLoader /> : (
        <Card className="glass-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users?.map((user: any) => (
                <TableRow key={user.id} className={user.banned ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'provider' ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{user.college || "N/A"}</TableCell>
                  <TableCell>
                    <div className="text-xs flex gap-3 text-muted-foreground">
                      <span>{user.followersCount} flw</span>
                      <span>{user.postsCount} posts</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.banned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Active</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openRoleModal(user)} title="Change Role">
                      <Key className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleBan(user)} title={user.banned ? "Unban" : "Ban"}>
                      {user.banned ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserX className="w-4 h-4 text-amber-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.users?.length && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Simple Pagination */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing page {data?.page} of {Math.ceil((data?.total || 0) / (data?.pageSize || 15))} ({data?.total} total)
            </span>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p=>p+1)} disabled={!data?.users?.length || data.users.length < pageSize}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isRoleModalOpen} onClose={() => setRoleModalOpen(false)} title="Change User Role">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Change role for <strong className="text-white">{selectedUser?.name}</strong>. Admin access grants full system control.
          </p>
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="provider">Provider</option>
            <option value="admin">Administrator</option>
          </Select>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRoleChange} isLoading={changeRoleMut.isPending}>Save Role</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
