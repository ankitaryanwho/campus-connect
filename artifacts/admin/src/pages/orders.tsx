import { useState, useEffect } from "react";
import { adminFetch, formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Select, PageLoader, Modal, Input } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, RefreshCw, XCircle, User, Search } from "lucide-react";

type Order = {
  id: string;
  type: string;
  title: string;
  status: string;
  price: string;
  posterId: string;
  posterName: string;
  createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  assignment: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  certification: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  task: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  delivery: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const ALL_STATUSES = ["open", "booked", "accepted", "in_progress", "completed", "delivered", "cancelled", "pending", "payment_confirmed", "reaching_pickup", "reaching_drop", "placed_order", "collecting_order"];

export default function OrdersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<{ items: Order[]; total: number; page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status) params.append("status", status);
      if (type) params.append("type", type);
      const result = await adminFetch(`/orders?${params}`);
      setData(result);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, type, page]);

  const openDetail = (o: Order) => {
    setSelectedOrder(o);
    setNewStatus(o.status);
    setDetailOpen(true);
  };

  const updateStatus = async () => {
    if (!selectedOrder) return;
    try {
      const ep =
        selectedOrder.type === "assignment" ? `/assignments/${selectedOrder.id}/status` :
        selectedOrder.type === "certification" ? `/certifications/${selectedOrder.id}/status` :
        selectedOrder.type === "task" ? `/tasks/${selectedOrder.id}/status` :
        `/deliveries/${selectedOrder.id}/status`;
      await adminFetch(ep, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast({ description: "Status updated successfully" });
      setDetailOpen(false);
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const filtered = data?.items.filter((o) =>
    !search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.posterName?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const pageSize = 20;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Order Management</h1>
          <p className="text-muted-foreground text-sm">Combined view of all assignments, certifications, deliveries & tasks.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["assignment", "certification", "task", "delivery"].map((t) => {
          const cnt = data?.items.filter((o) => o.type === t).length ?? 0;
          return (
            <Card key={t} className="glass-panel p-4">
              <div className="text-xs text-muted-foreground capitalize mb-1">{t}s</div>
              <div className="text-2xl font-bold text-white">{cnt}</div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search title or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="w-36">
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="assignment">Assignment</option>
            <option value="certification">Certification</option>
            <option value="task">Task</option>
            <option value="delivery">Delivery</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? <PageLoader /> : (
        <Card className="glass-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Posted By</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium text-white max-w-[200px] truncate">{order.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{order.id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[order.type] || ""}`}>
                      {order.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{order.posterName || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.price)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status) as any}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(order)}>
                      Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{total} total orders</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isDetailOpen} onClose={() => setDetailOpen(false)} title="Update Order Status">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Order:</span> <span className="text-white font-medium">{selectedOrder.title}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="text-white capitalize">{selectedOrder.type}</span></div>
              <div><span className="text-muted-foreground">Current Status:</span> <Badge variant={getStatusColor(selectedOrder.status) as any}>{selectedOrder.status}</Badge></div>
            </div>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDetailOpen(false)}>Cancel</Button>
              <Button onClick={updateStatus}>Update Status</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
