import { useState } from "react";
import { useAdminListDeliveries, useAdminDeleteDelivery, useAdminListAssignments, useAdminDeleteAssignment, useAdminListTasks, useAdminDeleteTask } from "@workspace/api-client-react";
import { useAuthHeaders, formatCurrency, formatDate } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Select, Badge, Button, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Package, FileText, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ServicesPage() {
  const [tab, setTab] = useState<"deliveries" | "assignments" | "tasks">("deliveries");

  return (
    <div className="space-y-6 animate-in-fade">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Services Marketplace</h1>
        <p className="text-muted-foreground">Manage active requests and peer-to-peer services.</p>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-px">
        <TabButton active={tab === "deliveries"} onClick={() => setTab("deliveries")} icon={Package} label="Deliveries" />
        <TabButton active={tab === "assignments"} onClick={() => setTab("assignments")} icon={FileText} label="Academic Help" />
        <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")} icon={ClipboardList} label="Tasks" />
      </div>

      {tab === "deliveries" && <DeliveriesTab />}
      {tab === "assignments" && <AssignmentsTab />}
      {tab === "tasks" && <TasksTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/5'} rounded-t-lg`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

// --- DELIVERIES TAB ---
function DeliveriesTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useAdminListDeliveries({ search, status, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteDelivery({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/services/deliveries"] }); toast({ description: "Deleted" }); }}});

  if (isLoading) return <PageLoader />;

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="p-4 flex gap-4 bg-black/20 border-b border-white/5">
        <Input placeholder="Search user or location..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-40">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="delivered">Delivered</option>
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
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items?.map((d: any) => (
            <TableRow key={d.id}>
              <TableCell className="capitalize font-medium">{d.pickupType}</TableCell>
              <TableCell className="text-xs">
                <span className="text-muted-foreground block">{d.pickupLocation}</span>
                <span className="text-white">↓ {d.dropLocation}</span>
              </TableCell>
              <TableCell className="text-xs">
                <span className="block text-primary">{d.requesterName}</span>
                <span className="block text-muted-foreground">{d.agentName || 'Unassigned'}</span>
              </TableCell>
              <TableCell><StatusBadge status={d.status} /></TableCell>
              <TableCell>{formatCurrency(d.deliveryFee)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete delivery?")) delMut.mutate({ id: d.id }, req) }}><Trash2 className="w-4 h-4 text-red-400"/></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
    </Card>
  );
}

// --- ASSIGNMENTS TAB ---
function AssignmentsTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useAdminListAssignments({ search, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteAssignment({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/services/assignments"] }); toast({ description: "Deleted" }); }}});

  if (isLoading) return <PageLoader />;

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="p-4 flex gap-4 bg-black/20 border-b border-white/5">
        <Input placeholder="Search title..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Poster</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items?.map((d: any) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.title}</TableCell>
              <TableCell>{d.posterName}</TableCell>
              <TableCell>{formatCurrency(d.price)}</TableCell>
              <TableCell><StatusBadge status={d.status} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete assignment?")) delMut.mutate({ id: d.id }, req) }}><Trash2 className="w-4 h-4 text-red-400"/></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
    </Card>
  );
}

// --- TASKS TAB ---
function TasksTab() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useAdminListTasks({ search, page, pageSize: 10 }, { ...req });
  const delMut = useAdminDeleteTask({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/services/tasks"] }); toast({ description: "Deleted" }); }}});

  if (isLoading) return <PageLoader />;

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="p-4 flex gap-4 bg-black/20 border-b border-white/5">
        <Input placeholder="Search task..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task Title</TableHead>
            <TableHead>Poster</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items?.map((d: any) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.title}</TableCell>
              <TableCell>{d.posterName}</TableCell>
              <TableCell>{formatCurrency(d.price)}</TableCell>
              <TableCell><StatusBadge status={d.status} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete task?")) delMut.mutate({ id: d.id }, req) }}><Trash2 className="w-4 h-4 text-red-400"/></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationFooter page={page} setPage={setPage} total={data?.total} pageSize={10} count={data?.items?.length} />
    </Card>
  );
}


function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let v: "default"|"success"|"warning"|"secondary"|"outline" = "outline";
  if (['completed', 'delivered'].includes(s)) v = "success";
  if (['pending', 'open'].includes(s)) v = "warning";
  if (['accepted', 'in_progress', 'booked'].includes(s)) v = "default";
  
  return <Badge variant={v} className="capitalize">{s.replace('_', ' ')}</Badge>;
}

function PaginationFooter({ page, setPage, total = 0, pageSize, count = 0 }: any) {
  return (
    <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm bg-black/20">
      <span className="text-muted-foreground">
        Showing page {page} of {Math.max(1, Math.ceil(total / pageSize))} ({total} total)
      </span>
      <div className="space-x-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p:number)=>Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p:number)=>p+1)} disabled={count < pageSize}>Next</Button>
      </div>
    </div>
  );
}
