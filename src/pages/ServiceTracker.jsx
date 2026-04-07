import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, AlertCircle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const currency = "$";

const emptyForm = { client_name: "", description: "", amount: "", service_date: new Date().toISOString().split("T")[0], renter_id: "" };

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
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!isAdmin && !myRenter) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
      <AlertCircle className="w-10 h-10 text-muted-foreground" />
      <p className="font-semibold">No renter profile linked to your account.</p>
    </div>
  );

  const visibleEntries = isAdmin
    ? (filterRenter === "all" ? entries : entries.filter(e => e.renter_id === filterRenter))
    : entries.filter(e => e.renter_id === myRenter?.id);

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
          { label: "Total Services", value: formatCurrency(totalAmt, currency), color: "text-foreground" },
          { label: isAdmin ? "Total Renter Earnings" : "Your Earnings", value: formatCurrency(totalRenter, currency), color: "text-emerald-600" },
          { label: "Owner Earnings", value: formatCurrency(totalOwner, currency), color: "text-indigo-600" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
            <p className={cn("text-xl font-bold font-mono mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter (admin only) */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <Select value={filterRenter} onValueChange={setFilterRenter}>
            <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue placeholder="Filter by renter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Renters</SelectItem>
              {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              {isAdmin && <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>}
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Client</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Service</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleEntries.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground text-sm">No service entries yet.</td></tr>
            )}
            {visibleEntries.map(entry => {
              const renter = renters.find(r => r.id === entry.renter_id);
              return (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {entry.service_date ? new Date(entry.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-3 font-medium">{renter?.name || "—"}</td>
                  )}
                  <td className="px-3 py-3 hidden sm:table-cell text-muted-foreground">{entry.client_name || "—"}</td>
                  <td className="px-3 py-3 hidden md:table-cell text-muted-foreground text-xs max-w-[140px] truncate">{entry.description || "—"}</td>
                  <td className="px-3 py-3 text-right font-mono font-medium">{formatCurrency(entry.amount || 0, currency)}</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-600 font-semibold">
                    +{formatCurrency(entry.renter_earnings || 0, currency)}
                    <span className="text-[10px] text-muted-foreground ml-1">({entry.renter_pct || 0}%)</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-indigo-600 font-semibold">
                    +{formatCurrency(entry.owner_earnings || 0, currency)}
                    <span className="text-[10px] text-muted-foreground ml-1">({entry.owner_earnings && entry.amount ? Math.round((entry.owner_earnings / entry.amount) * 100) : 0}%)</span>
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
              <tr className="bg-muted/50 border-t border-border">
                <td colSpan={isAdmin ? 4 : 3} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Totals</td>
                <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totalAmt, currency)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(totalRenter, currency)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold text-indigo-600">{formatCurrency(totalOwner, currency)}</td>
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
            <Input placeholder="Client name (optional)" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="h-9" />
            <Input placeholder="Service description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-9" />
            <Input type="number" placeholder="Service amount ($)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9 font-mono" min="0" step="0.01" />
            <Input type="date" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} className="h-9" />

            {/* Live Commission Preview */}
            {form.amount && parseFloat(form.amount) > 0 && selectedRenter && (
              <div className="rounded-lg bg-muted/60 border border-border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Split Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedRenter.name} ({previewRenterPct}%)</span>
                  <span className="font-mono font-semibold text-emerald-600">+{formatCurrency((previewAmt * previewRenterPct) / 100, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner ({previewOwnerPct}%)</span>
                  <span className="font-mono font-semibold text-indigo-600">+{formatCurrency((previewAmt * previewOwnerPct) / 100, currency)}</span>
                </div>
              </div>
            )}
            {form.amount && parseFloat(form.amount) > 0 && !isAdmin && myRenter && (
              <div className="rounded-lg bg-muted/60 border border-border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Split Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Cut ({100 - (myRenter.commission_owner ?? 100)}%)</span>
                  <span className="font-mono font-semibold text-emerald-600">+{formatCurrency((previewAmt * (100 - (myRenter.commission_owner ?? 100))) / 100, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner ({myRenter.commission_owner ?? 100}%)</span>
                  <span className="font-mono font-semibold text-indigo-600">+{formatCurrency((previewAmt * (myRenter.commission_owner ?? 100)) / 100, currency)}</span>
                </div>
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