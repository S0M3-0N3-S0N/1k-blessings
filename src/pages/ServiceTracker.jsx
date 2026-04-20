import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, categoryBadge, computeEarnings, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import PullToRefresh from "@/components/PullToRefresh";

const emptyForm = { renter_id: "", client_name: "", description: "", amount: "", service_date: new Date().toISOString().split("T")[0], category: "hair" };

export default function ServiceTracker() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [myRenter, setMyRenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterRenter, setFilterRenter] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  const loadData = useCallback(async () => {
    const [r, s] = await Promise.all([base44.entities.Renter.list(), base44.entities.ServiceEntry.list("-service_date", 200)]);
    setRenters(r);
    if (!isAdmin && user?.email) {
      const me = r.find(x => x.user_email === user.email);
      setMyRenter(me || null);
      setServices(me ? s.filter(x => x.renter_id === me.id) : []);
    } else {
      setServices(s);
    }
    setLoading(false);
  }, [isAdmin, user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const handleSave = async () => {
    if (!form.amount || !form.service_date) return;
    setSaving(true);
    const renterId = isAdmin ? form.renter_id : myRenter?.id;
    if (!renterId) { setSaving(false); return; }
    const renter = renterMap[renterId];
    const amt = parseFloat(form.amount) || 0;
    const earnings = computeEarnings(amt, renter);
    await base44.entities.ServiceEntry.create({ ...form, renter_id: renterId, amount: amt, ...earnings });
    setShowAdd(false); setForm(emptyForm); setSaving(false); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const filtered = services
    .filter(s => filterRenter === "all" || s.renter_id === filterRenter)
    .filter(s => filterCat === "all" || s.category === filterCat);

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const totalStylistEarnings = filtered.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const totalOwnerCommission = filtered.reduce((s, e) => s + (e.owner_earnings || 0), 0);

  // For dialog commission preview
  const selectedRenter = isAdmin ? renterMap[form.renter_id] : myRenter;
  const previewAmt = parseFloat(form.amount) || 0;
  const previewEarnings = selectedRenter && previewAmt > 0 ? computeEarnings(previewAmt, selectedRenter) : null;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Services</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Service Tracker</h1>
          </div>
          <GoldButton onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Log a Service</GoldButton>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Services" value={formatCurrency(totalAmount)} accent />
          <KpiCard label="Stylists' Earnings" value={formatCurrency(totalStylistEarnings)} />
          <KpiCard label="Our Commission" value={formatCurrency(totalOwnerCommission)} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Select value={filterRenter} onValueChange={setFilterRenter}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Stylists" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stylists</SelectItem>
                {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="hair">Hair</SelectItem>
              <SelectItem value="nails">Nails</SelectItem>
              <SelectItem value="aesthetics">Aesthetics</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No services found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    {isAdmin && <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stylist</th>}
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client / Service</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total $</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Split</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(s => {
                    const cat = categoryBadge(s.category);
                    const r = renterMap[s.renter_id];
                    const isCommission = r?.payment_model === "commission";
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {s.service_date ? new Date(s.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </td>
                        {isAdmin && <td className="px-4 py-3 font-medium">{r?.name || "—"}</td>}
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.description || "—"}</p>
                          {s.client_name && <p className="text-xs text-muted-foreground">{s.client_name}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", cat.className)}>{cat.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.amount)}</td>
                        <td className="px-4 py-3">
                          {isCommission ? (
                            <div className="flex items-center gap-2 w-28">
                              <SplitBar ownerPct={r.commission_owner || 40} />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{r.commission_owner||40}%</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border border-primary/30 text-primary bg-primary/5">Rent</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => base44.entities.ServiceEntry.delete(s.id).then(loadData)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20 border-t border-border font-semibold">
                    <td colSpan={isAdmin ? 4 : 3} className="px-5 py-3 text-sm">Totals</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalAmount)}</td>
                    <td colSpan={2} className="px-4 py-3 text-xs text-muted-foreground">
                      Stylists: {formatCurrency(totalStylistEarnings)} · Ours: {formatCurrency(totalOwnerCommission)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log a Service</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {isAdmin && (
              <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Stylist *" /></SelectTrigger>
                <SelectContent>{renters.filter(r => r.status === "active").map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hair">Hair</SelectItem>
                <SelectItem value="nails">Nails</SelectItem>
                <SelectItem value="aesthetics">Aesthetics</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Client Name (optional)" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="font-mono" min="0" step="0.01" />
            <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} />

            {/* Commission preview */}
            {previewEarnings && selectedRenter && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                {selectedRenter.payment_model === "commission" ? (
                  <>
                    <SplitBar ownerPct={selectedRenter.commission_owner || 40} height="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Owner {selectedRenter.commission_owner||40}%</span>
                      <span className="font-mono font-semibold text-primary">{formatCurrency(previewEarnings.owner_earnings)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stylist {previewEarnings.renter_pct}%</span>
                      <span className="font-mono font-semibold">{formatCurrency(previewEarnings.renter_earnings)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">This stylist is on a rent model — full service amount goes to them.</p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.amount}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}