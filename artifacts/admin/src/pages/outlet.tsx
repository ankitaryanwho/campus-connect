import { useState, useEffect, useRef } from "react";
import { adminFetch, formatCurrency } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Edit, Trash2, RefreshCw, Search, ToggleLeft, ToggleRight, X } from "lucide-react";

type OutletItem = {
  id: string;
  outletName: string;
  name: string;
  price: string;
  available: boolean;
};

type FormErrors = { outletName?: string; name?: string; price?: string };

export default function OutletPage() {
  const { toast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<OutletItem[]>([]);
  const [outlets, setOutlets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOutlet, setFilterOutlet] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fOutlet, setFOutlet] = useState("");
  const [fName, setFName] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fAvailable, setFAvailable] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  const load = async (q?: { search?: string; outlet?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const s = q?.search ?? search;
      const o = q?.outlet ?? filterOutlet;
      if (s) params.set("search", s);
      if (o) params.set("outlet", o);
      const res = await adminFetch(`/outlet-items?${params}`);
      setItems(Array.isArray(res.items) ? res.items : []);
      setOutlets(Array.isArray(res.outlets) ? res.outlets : []);
    } catch (e: any) {
      toast({ variant: "destructive", description: `Failed to load: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = (prefillOutlet = "") => {
    setEditingId(null);
    setFOutlet(prefillOutlet);
    setFName("");
    setFPrice("");
    setFAvailable(true);
    setErrors({});
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const openEdit = (item: OutletItem) => {
    setEditingId(item.id);
    setFOutlet(item.outletName);
    setFName(item.name);
    setFPrice(String(parseFloat(item.price) || ""));
    setFAvailable(item.available);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setErrors({});
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!fOutlet.trim()) e.outletName = "Outlet name is required";
    if (!fName.trim()) e.name = "Item name is required";
    const p = parseFloat(fPrice);
    if (!fPrice || isNaN(p) || p <= 0) e.price = "Enter a valid price (e.g. 50)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const body = {
      outletName: fOutlet.trim(),
      name: fName.trim(),
      price: String(parseFloat(fPrice)),
      available: fAvailable,
    };
    try {
      if (editingId) {
        await adminFetch(`/outlet-items/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        toast({ description: `"${body.name}" updated` });
      } else {
        await adminFetch("/outlet-items", { method: "POST", body: JSON.stringify(body) });
        toast({ description: `"${body.name}" added to ${body.outletName}` });
      }
      closeModal();
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", description: `Error: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return;
    try {
      await adminFetch(`/outlet-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ description: `"${itemName}" deleted` });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const toggleAvail = async (item: OutletItem) => {
    try {
      await adminFetch(`/outlet-items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ available: !item.available }),
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  // Filter items
  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterOutlet && item.outletName !== filterOutlet) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, OutletItem[]>>((acc, item) => {
    (acc[item.outletName] = acc[item.outletName] || []).push(item);
    return acc;
  }, {});

  // Field component
  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Outlet / Shop Management</h1>
          <p className="text-muted-foreground text-sm">Add and manage campus outlet menus and availability.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Outlets", value: outlets.length, color: "text-white" },
          { label: "Total Items", value: items.length, color: "text-white" },
          { label: "Available", value: items.filter((i) => i.available).length, color: "text-emerald-400" },
          { label: "Unavailable", value: items.filter((i) => !i.available).length, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="glass-panel p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
          />
        </div>
        <select
          value={filterOutlet}
          onChange={(e) => setFilterOutlet(e.target.value)}
          className="h-10 w-44 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none"
        >
          <option value="">All Outlets</option>
          {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Card>

      {/* Items list */}
      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && (
            <Card className="glass-panel p-16 text-center">
              <Store className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground mb-6 text-lg">No outlet items yet.</p>
              <Button onClick={() => openCreate()}>
                <Plus className="w-4 h-4 mr-2" /> Add Your First Item
              </Button>
            </Card>
          )}
          {Object.entries(grouped).map(([outletName, outletItems]) => (
            <Card key={outletName} className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{outletName}</h3>
                    <p className="text-xs text-muted-foreground">{outletItems.length} item{outletItems.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreate(outletName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add item
                </button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outletItems.map((item) => (
                    <TableRow key={item.id} className={!item.available ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-white">{item.name}</TableCell>
                      <TableCell className="text-emerald-400 font-semibold">{formatCurrency(item.price)}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleAvail(item)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-70 ${item.available ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {item.available
                            ? <><ToggleRight className="w-4 h-4" /> Available</>
                            : <><ToggleLeft className="w-4 h-4" /> Unavailable</>}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id, item.name)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ─── Modal (Portal-style, always mounted) ─── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl shadow-black/60 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Edit Item" : "Add New Item"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Outlet Name */}
              <Field label="Outlet / Shop Name *" error={errors.outletName}>
                <input
                  ref={nameRef}
                  type="text"
                  list="outlet-list"
                  value={fOutlet}
                  onChange={(e) => { setFOutlet(e.target.value); setErrors((p) => ({ ...p, outletName: undefined })); }}
                  placeholder="e.g. Dominos, Campus Café, CCD"
                  className={`flex h-10 w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${errors.outletName ? "border-red-500" : "border-white/15"}`}
                />
                <datalist id="outlet-list">
                  {outlets.map((o) => <option key={o} value={o} />)}
                </datalist>
              </Field>

              {/* Item Name */}
              <Field label="Item Name *" error={errors.name}>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => { setFName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="e.g. Masala Chai, Paneer Roll"
                  className={`flex h-10 w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${errors.name ? "border-red-500" : "border-white/15"}`}
                />
              </Field>

              {/* Price */}
              <Field label="Price (₹) *" error={errors.price}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={fPrice}
                  onChange={(e) => { setFPrice(e.target.value); setErrors((p) => ({ ...p, price: undefined })); }}
                  placeholder="e.g. 50"
                  className={`flex h-10 w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${errors.price ? "border-red-500" : "border-white/15"}`}
                />
              </Field>

              {/* Availability */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2">Availability</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFAvailable(true)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${fAvailable ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-white/10 text-white/50 hover:border-white/25"}`}
                  >
                    ✓ Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setFAvailable(false)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${!fAvailable ? "border-red-500 bg-red-500/15 text-red-400" : "border-white/10 text-white/50 hover:border-white/25"}`}
                  >
                    ✕ Unavailable
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              {fName.trim() && fPrice && !isNaN(parseFloat(fPrice)) && (
                <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{fName.trim()}</div>
                    <div className="text-xs text-muted-foreground">
                      {fOutlet.trim() || "Unnamed Outlet"} · ₹{parseFloat(fPrice).toFixed(2)} · {fAvailable ? "Available" : "Unavailable"}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-white/70 hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    editingId ? "Save Changes" : "Add Item"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
