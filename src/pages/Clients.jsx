import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Loader2, Search, Plus, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", preferred_renter_id: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [c, r] = await Promise.all([
        base44.entities.Client.list("-last_visit_date"),
        base44.entities.Renter.list()
      ]);
      setClients(c);
      setRenters(r);
      setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load data. Pull down to retry.');
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await base44.entities.Client.create(form);
      setForm({ name: "", phone: "", email: "", preferred_renter_id: "", notes: "" });
      setShowDialog(false);
      toast({ title: "Client added" });
      loadData();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const newThisMonth = clients.filter(c => {
    const d = new Date(c.created_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const avgVisits = clients.length > 0 ? (clients.reduce((s, c) => s + (c.visit_count || 0), 0) / clients.length).toFixed(1) : 0;
  const topSpender = clients.length > 0 ? clients.reduce((max, c) => (c.total_spent || 0) > (max.total_spent || 0) ? c : max, clients[0]) : null;

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <div className="text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
      <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Retry</button>
    </div>
  );

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const getLoyaltyTier = (visitCount) => {
    if (visitCount >= 10) return { label: "Gold", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" };
    if (visitCount >= 5) return { label: "Silver", color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" };
    return { label: "Bronze", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" };
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Preferred Stylist", "Total Visits", "Total Spent", "Last Visit"];
    const rows = clients.map(c => [
      c.name,
      c.email || "",
      c.phone || "",
      renterMap[c.preferred_renter_id]?.name || "",
      c.visit_count || 0,
      (c.total_spent || 0).toFixed(2),
      c.last_visit_date || ""
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Clients</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Client Management</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
            <GoldButton size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Client
            </GoldButton>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Clients" value={clients.length} />
          <KpiCard label="New This Month" value={newThisMonth} />
          <KpiCard label="Avg Visits" value={avgVisits} sub="per client" />
          <KpiCard label="Top Spender" value={topSpender ? formatCurrency(topSpender.total_spent) : "$0.00"} sub={topSpender?.name || "—"} accent glow />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>

        {/* Client List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-serif text-lg">No clients yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first client to track repeat business</p>
            </div>
            <GoldButton onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" /> Add Client
            </GoldButton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => {
              const tier = getLoyaltyTier(c.visit_count || 0);
              const av = getAvatarColor(i);
              return (
                <div key={c.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", av.bg, av.text)}>
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.visit_count || 0} visits</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", tier.color)}>{tier.label}</span>
                  </div>

                  <div className="space-y-1 text-xs border-t border-border pt-3">
                    {c.email && <p className="text-muted-foreground">{c.email}</p>}
                    {c.phone && <p className="text-muted-foreground">{c.phone}</p>}
                    {c.preferred_renter_id && (
                      <p className="text-muted-foreground">Prefers: <span className="font-medium">{renterMap[c.preferred_renter_id]?.name || "—"}</span></p>
                    )}
                    {c.last_visit_date && (
                      <p className="text-muted-foreground">Last visit: {new Date(c.last_visit_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    )}
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                    <p className="font-mono font-semibold text-sm">{formatCurrency(c.total_spent)}</p>
                  </div>

                  {c.notes && (
                    <div className="bg-muted/30 rounded-lg p-2 border border-border/50 text-xs text-muted-foreground leading-relaxed">
                      {c.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client name" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Preferred Stylist</label>
              <select value={form.preferred_renter_id} onChange={e => setForm(f => ({ ...f, preferred_renter_id: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent text-sm min-h-[44px]">
                <option value="">None</option>
                {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent text-sm" rows="3" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowDialog(false)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}