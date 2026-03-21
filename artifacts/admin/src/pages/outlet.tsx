import { useState, useEffect } from "react";
import { adminFetch, formatCurrency } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button, Input, Select, PageLoader, Modal } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Edit, Trash2, RefreshCw, Search, ToggleLeft, ToggleRight } from "lucide-react";

type OutletItem = {
  id: string;
  outletName: string;
  name: string;
  price: string;
  available: boolean;
  createdAt?: string;
};

const INITIAL_FORM = { outletName: "", name: "", price: "", available: true };

export default function OutletPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OutletItem[]>([]);
  const [outlets, setOutlets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOutlet, setFilterOutlet] = useState("");

  // Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOutletName, setFormOutletName] = useState("");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterOutlet) params.set("outlet", filterOutlet);
      const res = await adminFetch(`/outlet-items?${params}`);
      setItems(Array.isArray(res.items) ? res.items : []);
      setOutlets(Array.isArray(res.outlets) ? res.outlets : []);
    } catch (e: any) {
      toast({ variant: "destructive", description: `Load failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filterOutlet]);

  const openCreate = () => {
    setEditingId(null);
    setFormOutletName("");
    setFormName("");
    setFormPrice("");
    setFormAvailable(true);
    setModalOpen(true);
  };

  const openEdit = (item: OutletItem) => {
    setEditingId(item.id);
    setFormOutletName(item.outletName);
    setFormName(item.name);
    setFormPrice(String(parseFloat(item.price)));
    setFormAvailable(item.available);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const save = async () => {
    const trimName = formName.trim();
    const trimOutlet = formOutletName.trim();
    const priceNum = parseFloat(formPrice);

    if (!trimOutlet) {
      toast({ variant: "destructive", description: "Outlet name is required." });
      return;
    }
    if (!trimName) {
      toast({ variant: "destructive", description: "Item name is required." });
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: "destructive", description: "Enter a valid price greater than 0." });
      return;
    }

    const body = {
      outletName: trimOutlet,
      name: trimName,
      price: String(priceNum),
      available: formAvailable,
    };

    setSaving(true);
    try {
      if (editingId) {
        await adminFetch(`/outlet-items/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast({ description: `"${trimName}" updated successfully` });
      } else {
        await adminFetch("/outlet-items", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ description: `"${trimName}" added to ${trimOutlet}` });
      }
      closeModal();
      load();
    } catch (e: any) {
      toast({ variant: "destructive", description: `Save failed: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}" permanently?`)) return;
    try {
      await adminFetch(`/outlet-items/${id}`, { method: "DELETE" });
      toast({ description: `"${itemName}" deleted` });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      toast({ variant: "destructive", description: `Delete failed: ${e.message}` });
    }
  };

  const toggleAvailability = async (item: OutletItem) => {
    try {
      await adminFetch(`/outlet-items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ available: !item.available }),
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !item.available } : i));
    } catch (e: any) {
      toast({ variant: "destructive", description: `Update failed: ${e.message}` });
    }
  };

  // Group items by outlet name
  const grouped = items.reduce<Record<string, OutletItem[]>>((acc, item) => {
    acc[item.outletName] = acc[item.outletName] || [];
    acc[item.outletName].push(item);
    return acc;
  }, {});

  const modalTitle = editingId ? "Edit Item" : "Add New Item";
  const availableCount = items.filter((i) => i.available).length;
  const unavailableCount = items.filter((i) => !i.available).length;

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Header */}
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
          <div className="text-2xl font-bold text-emerald-400">{availableCount}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Unavailable</div>
          <div className="text-2xl font-bold text-red-400">{unavailableCount}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}>
            <option value="">All Outlets</option>
            {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
      </Card>

      {/* Items grouped by outlet */}
      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && (
            <Card className="glass-panel p-12 text-center">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No outlet items found. Create your first one.</p>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add First Item</Button>
            </Card>
          )}

          {Object.entries(grouped).map(([outletName, outletItems]) => (
            <Card key={outletName} className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{outletName}</h3>
                    <p className="text-xs text-muted-foreground">{outletItems.length} items</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormOutletName(outletName);
                    setFormName("");
                    setFormPrice("");
                    setFormAvailable(true);
                    setEditingId(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add to {outletName}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outletItems.map((item) => (
                    <TableRow key={item.id} className={!item.available ? "opacity-60" : ""}>
                      <TableCell>
                        <span className="font-medium text-white">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-emerald-400">{formatCurrency(item.price)}</span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleAvailability(item)}
                          title={item.available ? "Click to mark unavailable" : "Click to mark available"}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 ${item.available ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {item.available
                            ? <><ToggleRight className="w-5 h-5" /> Available</>
                            : <><ToggleLeft className="w-5 h-5" /> Unavailable</>
                          }
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(item)}
                            title="Edit item"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItem(item.id, item.name)}
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={modalTitle}>
        <div className="space-y-4">
          {/* Outlet Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Outlet / Shop Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              list="outlet-options"
              value={formOutletName}
              onChange={(e) => setFormOutletName(e.target.value)}
              placeholder="e.g. Campus Café, Dominos, CCD"
              className="flex h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
            <datalist id="outlet-options">
              {outlets.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Item Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Masala Chai, Paneer Roll"
              className="flex h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Price (₹) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="e.g. 50"
              className="flex h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Availability</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormAvailable(true)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${formAvailable ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-muted-foreground hover:border-white/30"}`}
              >
                ✓ Available
              </button>
              <button
                type="button"
                onClick={() => setFormAvailable(false)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${!formAvailable ? "border-red-500 bg-red-500/10 text-red-400" : "border-white/10 text-muted-foreground hover:border-white/30"}`}
              >
                ✕ Unavailable
              </button>
            </div>
          </div>

          {/* Preview */}
          {formName && formPrice && (
            <div className="rounded-lg bg-black/20 border border-white/5 p-3 text-sm">
              <span className="text-muted-foreground">Preview: </span>
              <span className="text-white font-medium">{formName}</span>
              {formPrice && <span className="text-emerald-400 ml-2">₹{formPrice}</span>}
              <span className={`ml-2 text-xs ${formAvailable ? "text-emerald-400" : "text-red-400"}`}>
                • {formAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={save} isLoading={saving}>
              {editingId ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
