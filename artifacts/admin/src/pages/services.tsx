import { useState } from "react";
import {
  useAdminListDeliveries, useAdminDeleteDelivery,
  useAdminListAssignments, useAdminDeleteAssignment,
  useAdminListTasks, useAdminDeleteTask,
} from "@workspace/api-client-react";
import { useAuthHeaders, formatCurrency, formatDate, adminFetch, getStatusColor } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Select, Badge, Button, PageLoader, Modal } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Package, FileText, ClipboardList, Edit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const DELIVERY_STATUSES = ["pending", "accepted", "reaching_pickup", "placed_order", "collecting_order", "reaching_drop", "delivered", "cancelled"];
const ASSIGNMENT_STATUSES = ["open", "booked", "accepted", "in_progress", "completed", "delivered", "cancelled"];
const TASK_STATUSES = ["open", "in_progress", "completed", "cancelled"];

export default function ServicesPage() {
  const [tab, setTab] = useState<"deliveries" | "assignments" | "tasks">("deliveries");

  return (
    <div className="space-y-6 animate-in-fade">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Services Marketplace</h1>
        <p className="text-muted-foreground">Manage and edit all active service requests.</p>
      </div>

      <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5 w-fit">
        {[
          { id: "deliveries", icon: Package, label: "Deliveries" },
          { id: "assignments", icon: FileText, label: "Academic Help" },
          { id: "tasks", icon: ClipboardList, label: "Tasks" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "deliveries" && <DeliveriesTab />}
      {tab === "assignments" && <AssignmentsTab />}
      {tab === "tasks" && <TasksTab />}
    </div>
  );
}

// ─── EDIT MODAL (reused) ──────────────────────────────────────────────────────
function EditModal({
  isOpen, onClose, title, fields, statusOptions, saving, onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: { label: string; value: string; onChange: (v: string) => void; type?: string }[];
  statusOptions: string[];
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <Input
              type={f.type || "text"}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
          <Select value={fields[fields.length - 1].value} onChange={(e) => fields[fields.length - 1].onChange(e.target.value)}>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} isLoading={saving}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── DELIVERIES TAB ───────────────────────────────────────────────────────────
function DeliveriesTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editFee, setEditFee] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useAdminListDeliveries({ search, status, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteDelivery({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services/deliveries"] });
        toast({ description: "Delivery deleted" });
      }
    }
  });

  const openEdit = (d: any) => {
    setEditItem(d);
    setEditStatus(d.status);
    setEditFee(d.deliveryFee || "");
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await adminFetch(`/services/deliveries/${editItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: editStatus, deliveryFee: editFee }),
      });
      toast({ description: "Delivery updated successfully" });
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/deliveries"] });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <Card className="glass-panel overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 bg-black/20 border-b border-white/5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search location or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All Statuses</option>
            {DELIVERY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Requester / Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items?.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="capitalize font-medium text-xs">{d.pickupType}</TableCell>
                <TableCell className="text-xs">
                  <span className="text-muted-foreground block">{d.pickupLocation}</span>
                  <span className="text-white">↓ {d.dropLocation}</span>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="block text-primary font-medium">{d.requesterName}</span>
                  <span className="block text-muted-foreground">{d.agentName || "Unassigned"}</span>
                </TableCell>
                <TableCell><Badge variant={getStatusColor(d.status) as any} className="capitalize">{d.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="font-medium">{formatCurrency(d.deliveryFee)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Edit">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this delivery?")) delMut.mutate({ id: d.id }, req); }} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.items?.length && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deliveries found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
      </Card>

      {/* Edit Delivery Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Delivery">
        {editItem && (
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">From:</span> <span className="text-white">{editItem.pickupLocation}</span></div>
              <div><span className="text-muted-foreground">To:</span> <span className="text-white">{editItem.dropLocation}</span></div>
              <div><span className="text-muted-foreground">Requester:</span> <span className="text-primary">{editItem.requesterName}</span></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Delivery Fee (₹)</label>
              <Input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)} placeholder="Delivery fee" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {DELIVERY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={saveEdit} isLoading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── ASSIGNMENTS TAB ──────────────────────────────────────────────────────────
function AssignmentsTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useAdminListAssignments({ search, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services/assignments"] });
        toast({ description: "Assignment deleted" });
      }
    }
  });

  const openEdit = (d: any) => {
    setEditItem(d);
    setEditStatus(d.status);
    setEditPrice(d.price || "");
    setEditTitle(d.title || "");
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await adminFetch(`/services/assignments/${editItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: editStatus, price: editPrice, title: editTitle }),
      });
      toast({ description: "Assignment updated successfully" });
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/assignments"] });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <Card className="glass-panel overflow-hidden">
        <div className="p-4 flex gap-3 bg-black/20 border-b border-white/5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Poster</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items?.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <span className="block truncate">{d.title}</span>
                </TableCell>
                <TableCell className="text-sm">{d.posterName}</TableCell>
                <TableCell className="font-medium">{formatCurrency(d.price)}</TableCell>
                <TableCell><Badge variant={getStatusColor(d.status) as any} className="capitalize">{d.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Edit">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this assignment?")) delMut.mutate({ id: d.id }, req); }} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.items?.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
      </Card>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Assignment">
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Price (₹)</label>
              <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {ASSIGNMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={saveEdit} isLoading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useAdminListTasks({ search, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services/tasks"] });
        toast({ description: "Task deleted" });
      }
    }
  });

  const openEdit = (d: any) => {
    setEditItem(d);
    setEditStatus(d.status);
    setEditBudget(d.price || d.budget || "");
    setEditTitle(d.title || "");
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await adminFetch(`/services/tasks/${editItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: editStatus, budget: editBudget, title: editTitle }),
      });
      toast({ description: "Task updated successfully" });
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/tasks"] });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <Card className="glass-panel overflow-hidden">
        <div className="p-4 flex gap-3 bg-black/20 border-b border-white/5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search task..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Title</TableHead>
              <TableHead>Poster</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items?.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <span className="block truncate">{d.title}</span>
                </TableCell>
                <TableCell className="text-sm">{d.posterName}</TableCell>
                <TableCell className="font-medium">{formatCurrency(d.price)}</TableCell>
                <TableCell><Badge variant={getStatusColor(d.status) as any} className="capitalize">{d.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Edit">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this task?")) delMut.mutate({ id: d.id }, req); }} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.items?.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tasks found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
      </Card>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Task">
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Budget (₹)</label>
              <Input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={saveEdit} isLoading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function PaginationFooter({ page, setPage, total = 0, pageSize, count = 0 }: any) {
  return (
    <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm bg-black/20">
      <span className="text-muted-foreground">
        Page {page} of {Math.max(1, Math.ceil(total / pageSize))} ({total} total)
      </span>
      <div className="space-x-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p: number) => p + 1)} disabled={count < pageSize}>Next</Button>
      </div>
    </div>
  );
}
