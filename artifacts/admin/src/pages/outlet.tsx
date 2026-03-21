import { useState, useEffect, useCallback } from "react";
import { adminFetch, formatCurrency } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Select, PageLoader, Modal } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Edit, Trash2, RefreshCw, Search, ToggleLeft, ToggleRight } from "lucide-react";

type OutletItem = {
  id: string;
  outletName: string;
  name: string;
  price: string;
  available: boolean;
};

type FormState = {
  outletName: string;
  name: string;
  price: string;
  available: boolean;
};

const EMPTY_FORM: FormState = { outletName: "", name: "", price: "", available: true };

export default function OutletPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OutletItem[]>([]);
  const [outlets, setOutlets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outlet, setOutlet] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OutletItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (outlet) params.append("outlet", outlet);
      const res = await adminFetch(`/outlet-items?${params}`);
      setItems(Array.isArray(res.items) ? res.items : []);
      setOutlets(Array.isArray(res.outlets) ? res.outlets : []);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [search, outlet]);

  useEffect(() => { load(); }, [search, outlet]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: OutletItem) => {
    setEditing(item);
    setForm({ outletName: item.outletName, name: item.name, price: item.price, available: item.available });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.outletName || !form.name || !form.price) {
      toast({ variant: "destructive", description: "Outlet name, item name, and price are required." });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminFetch(`/outlet-items/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        toast({ description: "Item updated successfully" });
      } else {
        await adminFetch("/outlet-items", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ description: "Item created successfully" });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" permanently?`)) return;
    try {
      await adminFetch(`/outlet-items/${id}`, { method: "DELETE" });
      toast({ description: "Item deleted" });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const toggleAvailability = async (item: OutletItem) => {
    try {
      await adminFetch(`/outlet-items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ available: !item.available }),
      });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  // Group by outlet
  const grouped = items.reduce<Record<string, OutletItem[]>>((acc, item) => {
    acc[item.outletName] = acc[item.outletName] || [];
    acc[item.outletName].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Outlet / Shop Management</h1>
          <p className="text-muted-foreground text-sm">Manage campus outlets, shops, and their menu items.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Outlets</div>
          <div className="text-2xl font-bold text-white">{outlets.length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Items</div>
          <div className="text-2xl font-bold text-white">{items.length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Available</div>
          <div className="text-2xl font-bold text-emerald-400">{items.filter((i) => i.available).length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Unavailable</div>
          <div className="text-2xl font-bold text-red-400">{items.filter((i) => !i.available).length}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="w-48">
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">All Outlets</option>
            {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
      </Card>

      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {Object.entries(grouped).length === 0 && (
            <Card className="glass-panel p-12 text-center">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No outlets found. Create your first item.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add First Item</Button>
            </Card>
          )}
          {Object.entries(grouped).map(([outletName, outletItems]) => (
            <Card key={outletName} className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{outletName}</h3>
                  <p className="text-xs text-muted-foreground">{outletItems.length} items</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outletItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium text-white">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-emerald-400">{formatCurrency(item.price)}</span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${item.available ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {item.available ? (
                            <><ToggleRight className="w-5 h-5" /> Available</>
                          ) : (
                            <><ToggleLeft className="w-5 h-5" /> Unavailable</>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id, item.name)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Item" : "Add New Item"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Outlet / Shop Name *</label>
            <Input
              placeholder="e.g. Campus Café"
              value={form.outletName}
              onChange={(e) => setForm((f) => ({ ...f, outletName: e.target.value }))}
              list="outlet-suggestions"
            />
            <datalist id="outlet-suggestions">
              {outlets.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Item Name *</label>
            <Input
              placeholder="e.g. Masala Chai"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price (₹) *</label>
            <Input
              type="number"
              placeholder="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Availability</label>
            <Select
              value={form.available ? "true" : "false"}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.value === "true" }))}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} isLoading={saving}>{editing ? "Save Changes" : "Create Item"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
