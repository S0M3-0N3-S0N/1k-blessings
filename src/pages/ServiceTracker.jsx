import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, categoryBadge, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton";
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

  const loadData = useCallback(async () => {
    const [r, s] = await Promise.all([base44.entities.Renter.list(), base44.entities.ServiceEntry.list("-service_date", 100)]);
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
    const ownerPct = renter?.commission_owner || 40;
    const renterPct = 100 - ownerPct;
    const amt = parseFloat(form.amount) || 0;
    await base44.entities.ServiceEntry.create({
      ...form,
      renter_id: renterId,
      amount: amt,
      renter_pct: renterPct,
      renter_earnings: parseFloat(((amt * renterPct) / 100).toFixed(2)),
      owner_earnings: parseFloat(((amt * ownerPct) / 100).toFixed(2)),
    });
    setShowAdd(false); setForm(emptyForm); setSaving(false); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Services</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Service Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{services.length} entries</p>
          </div>
          <GoldButton onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Log Service</GoldButton>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No services logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    {isAdmin && <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stylist</th>}
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stylist</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {services.map(s => {
                    const cat = categoryBadge(s.category);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {s.service_date ? new Date(s.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </td>
                        {isAdmin && <td className="px-4 py-3 font-medium">{renterMap[s.renter_id]?.name || "—"}</td>}
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.description || "—"}</p>
                          {s.client_name && <p className="text-xs text-muted-foreground">{s.client_name}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", cat.className)}>{cat.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(s.owner_earnings)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.renter_earnings)}</td>
                        <td className="px-2 py-3">
                          <button onClick={() => base44.entities.ServiceEntry.delete(s.id).then(loadData)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Service</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {isAdmin && (
              <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Stylist *" /></SelectTrigger>
                <SelectContent>{renters.filter(r => r.status === "active").map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Input placeholder="Client Name" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <Input type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="font-mono flex-1" min="0" step="0.01" />
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">Hair</SelectItem>
                  <SelectItem value="nails">Nails</SelectItem>
                  <SelectItem value="aesthetics">Aesthetics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} />
            {form.amount && (isAdmin ? renterMap[form.renter_id] : myRenter) && (() => {
              const r = isAdmin ? renterMap[form.renter_id] : myRenter;
              const ownerPct = r?.commission_owner || 40;
              const amt = parseFloat(form.amount) || 0;
              return (
                <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs flex justify-between">
                  <span className="text-muted-foreground">Owner: <span className="font-mono font-semibold text-primary">{formatCurrency((amt * ownerPct) / 100)}</span></span>
                  <span className="text-muted-foreground">Stylist: <span className="font-mono font-semibold">{formatCurrency((amt * (100 - ownerPct)) / 100)}</span></span>
                </div>
              );
            })()}
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