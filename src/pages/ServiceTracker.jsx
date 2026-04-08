import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, AlertCircle, Scissors, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const currency = "$";

const SERVICE_CATEGORIES = [
  { value: "hair", label: "Hair", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "nails", label: "Nails", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  { value: "aesthetics", label: "Aesthetics", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { value: "other", label: "Other", color: "bg-muted text-muted-foreground border-border" },
];

const getCategoryStyle = (cat) => SERVICE_CATEGORIES.find(c => c.value === cat)?.color || SERVICE_CATEGORIES[3].color;
const getCategoryLabel = (cat) => SERVICE_CATEGORIES.find(c => c.value === cat)?.label || cat || "Other";

const emptyForm = {
  client_name: "",
  description: "",
  amount: "",
  service_date: new Date().toISOString().split("T")[0],
  renter_id: "",
  category: "hair",
};

export default function ServiceTracker() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [renters, setRenters] = useState([]);
  const [myRenter, setMyRenter] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterRenter, setFilterRenter] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [clientHistory, setClientHistory] = useState([]);

  const loadData = useCallback(async () => {
    const [r, e] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.ServiceEntry.list("-service_date"),
    ]);
    setRenters(r);
    if (!isAdmin && user?.email) {
      const mine = r.find(x => x.user_email === user.email) || null;
      setMyRenter(mine);
    }
    setEntries(e);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load client history when client name changes
  useEffect(() => {
    if (!form.client_name || form.client_name.length < 2) { setClientHistory([]); return; }
    const matches = entries.filter(e =>
      e.client_name?.toLowerCase().includes(form.client_name.toLowerCase()) &&
      e.client_name !== form.client_name
    ).slice(0, 3);
    setClientHistory(matches);
  }, [form.client_name, entries]);

  const openAdd = () => {
    setForm({ ...emptyForm, renter_id: isAdmin ? "" : (myRenter?.id || "") });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.renter_id || !form.amount || !form.service_date) return;
    setSaving(true);
    const renter = renters.find(r => r.id === form.renter_id);
    const ownerPct = renter?.commission_owner ?? 100;
    const renterPct = 100 - ownerPct;
    const amt = parseFloat(form.amount) || 0;
    await base44.entities.ServiceEntry.create({
      renter_id: form.renter_id,
      client_name: form.client_name,
      description: form.description,
      amount: amt,
      service_date: form.service_date,
      renter_pct: renterPct,
      renter_earnings: parseFloat(((amt * renterPct) / 100).toFixed(2)),
      owner_earnings: parseFloat(((amt * ownerPct) / 100).toFixed(2)),
      category: form.category,
    });
    setShowAdd(false);
    setSaving(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.ServiceEntry.delete(id);
    loadData();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!isAdmin && !myRenter) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
      <AlertCircle className="w-10 h-10 text-muted-foreground" />
      <p className="font-semibold">No renter profile linked to your account.</p>
    </div>
  );

  let visibleEntries = isAdmin
    ? (filterRenter === "all" ? entries : entries.filter(e => e.renter_id === filterRenter))
    : entries.filter(e => e.renter_id === myRenter?.id);

  if (filterCategory !== "all") visibleEntries = visibleEntries.filter(e => (e.category || "other") === filterCategory);

  const totalRenter = visibleEntries.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const totalOwner = visibleEntries.reduce((s, e) => s + (e.owner_earnings || 0), 0);
  const totalAmt = visibleEntries.reduce((s, e) => s + (e.amount || 0), 0);

  const selectedRenter = form.renter_id ? renters.find(r => r.id === form.renter_id) : null;
  const previewOwnerPct = selectedRenter ? (selectedRenter.commission_owner ?? 100) : 0;
  const previewRenterPct = 100 - previewOwnerPct;
  const previewAmt = parseFloat(form.amount) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">Services</p>
          <h1 className="text-2xl font-bold tracking-tight">Service Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Log services and see commission splits</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Service
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Services", value: formatCurrency(totalAmt, currency), color: "text-foreground", bg: "bg-muted/30" },
          { label: isAdmin ? "Renter Earnings" : "Your Earnings", value: formatCurrency(totalRenter, currency), color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Owner Earnings", value: formatCurrency(totalOwner, currency), color: "text-primary", bg: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border border-border p-4", s.bg)}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
            <p className={cn("text-xl font-bold font-mono mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && (
          <Select value={filterRenter} onValueChange={setFilterRenter}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Filter by renter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Renters</SelectItem>
              {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {SERVICE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Entries Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              {isAdmin && <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>}
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Client</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Split</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleEntries.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground text-sm">No service entries yet.</td></tr>
            )}
            {visibleEntries.map(entry => {
              const renter = renters.find(r => r.id === entry.renter_id);
              const ownerPct = entry.owner_earnings && entry.amount ? Math.round((entry.owner_earnings / entry.amount) * 100) : 0;
              const renterPct = entry.renter_pct || 0;
              return (
                <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {entry.service_date ? new Date(entry.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  {isAdmin && <td className="px-3 py-3 font-medium">{renter?.name || "—"}</td>}
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div>
                      <p className="text-muted-foreground">{entry.client_name || "—"}</p>
                      {entry.description && <p className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">{entry.description}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", getCategoryStyle(entry.category || "other"))}>
                      {getCategoryLabel(entry.category)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">{formatCurrency(entry.amount || 0, currency)}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {/* Mini split bar */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-16 h-2.5 rounded-full overflow-hidden bg-muted flex">
                        <div className="bg-primary h-full transition-all" style={{ width: `${ownerPct}%` }} />
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${renterPct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ownerPct}%/{renterPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {visibleEntries.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t border-border">
                <td colSpan={isAdmin ? 4 : 3} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Totals</td>
                <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totalAmt, currency)}</td>
                <td className="px-3 py-3 hidden md:table-cell text-right">
                  <span className="text-xs text-primary font-mono font-bold">{formatCurrency(totalOwner, currency)}</span>
                  <span className="text-xs text-muted-foreground mx-1">/</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">{formatCurrency(totalRenter, currency)}</span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Scissors className="w-4 h-4" /> Log a Service</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {isAdmin && (
              <Select value={form.renter_id} onValueChange={v => setForm({ ...form, renter_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select renter" /></SelectTrigger>
                <SelectContent>
                  {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input placeholder="Client name (optional)" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="h-9" />
              {clientHistory.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Previous services for this client</p>
                  {clientHistory.map(h => (
                    <button key={h.id} onClick={() => setClientHistory([])}
                      className="w-full flex justify-between px-3 py-2 text-xs hover:bg-accent transition-colors text-left">
                      <span className="text-foreground">{h.client_name} — {h.description || "service"}</span>
                      <span className="text-primary font-mono">{formatCurrency(h.amount, currency)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input placeholder="Service description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-9" />
            <Input type="number" placeholder="Service amount ($)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9 font-mono" min="0" step="0.01" />
            <Input type="date" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} className="h-9" />

            {/* Commission Preview */}
            {form.amount && parseFloat(form.amount) > 0 && (selectedRenter || (!isAdmin && myRenter)) && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Split</p>
                {(() => {
                  const r = selectedRenter || myRenter;
                  const oPct = r.commission_owner ?? 100;
                  const rPct = 100 - oPct;
                  return (
                    <>
                      <div className="w-full h-2.5 rounded-full overflow-hidden flex">
                        <div className="bg-primary h-full" style={{ width: `${oPct}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${rPct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Owner {oPct}% — <span className="font-mono text-primary">{formatCurrency((previewAmt * oPct) / 100, currency)}</span></span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{r.name?.split(" ")[0]} {rPct}% — <span className="font-mono text-emerald-400">{formatCurrency((previewAmt * rPct) / 100, currency)}</span></span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 h-9" onClick={handleSave} disabled={saving || !form.amount || !form.service_date || (!isAdmin && !myRenter) || (isAdmin && !form.renter_id)}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}