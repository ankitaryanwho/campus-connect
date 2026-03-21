import { useState, useEffect } from "react";
import { adminFetch, formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Select, PageLoader, Modal } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, RefreshCw, Trash2, Edit, Users, Calendar, BookOpen } from "lucide-react";

type Session = {
  id: string;
  title: string;
  description?: string;
  price: string;
  sessionType: string;
  subject?: string;
  status: string;
  maxStudents?: number;
  scheduledAt?: string;
  mentorId: string;
  mentorName: string;
  createdAt: string;
};

const STATUS_OPTIONS = ["available", "booked", "in_progress", "completed", "cancelled"];
const SESSION_TYPE_COLORS: Record<string, string> = {
  one_on_one: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  group: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  recorded: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function CoachingPage() {
  const { toast } = useToast();
  const [data, setData] = useState<{ sessions: Session[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status) params.append("status", status);
      const res = await adminFetch(`/coaching?${params}`);
      setData(res);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, page]);

  const openEdit = (s: Session) => {
    setSelected(s);
    setNewStatus(s.status);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    try {
      await adminFetch(`/coaching/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast({ description: "Session updated successfully" });
      setEditModal(false);
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this coaching session permanently?")) return;
    try {
      await adminFetch(`/coaching/${id}`, { method: "DELETE" });
      toast({ description: "Session deleted" });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const statsByStatus = STATUS_OPTIONS.map((s) => ({
    status: s,
    count: sessions.filter((x) => x.status === s).length,
  }));

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Coaching Management</h1>
          <p className="text-muted-foreground text-sm">Manage tutoring sessions, mentors, and bookings.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Sessions</div>
          <div className="text-2xl font-bold text-white">{total}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Available</div>
          <div className="text-2xl font-bold text-emerald-400">{sessions.filter((s) => s.status === "available").length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Booked</div>
          <div className="text-2xl font-bold text-amber-400">{sessions.filter((s) => s.status === "booked").length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-bold text-blue-400">{sessions.filter((s) => s.status === "completed").length}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="w-48">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <span className="text-muted-foreground text-sm">{total} sessions total</span>
      </Card>

      {loading ? <PageLoader /> : (
        <Card className="glass-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium text-white max-w-[180px] truncate">{s.title}</div>
                    {s.maxStudents && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Users className="w-3 h-3" /> Max {s.maxStudents}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${SESSION_TYPE_COLORS[s.sessionType] || "border-white/10 text-white/70"}`}>
                      {s.sessionType?.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <BookOpen className="w-3 h-3 text-muted-foreground" />
                      {s.subject || "General"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-white">{s.mentorName || "Unknown"}</div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.scheduledAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(s.scheduledAt)}
                      </div>
                    ) : "Flexible"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(s.status) as any}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit Status">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSession(s.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!sessions.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No coaching sessions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Update Session Status">
        {selected && (
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Session:</span> <span className="text-white font-medium">{selected.title}</span></div>
              <div><span className="text-muted-foreground">Mentor:</span> <span className="text-white">{selected.mentorName}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="text-white capitalize">{selected.sessionType?.replace("_", " ")}</span></div>
            </div>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
