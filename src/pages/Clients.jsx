import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const emptyForm = { name: "", phone: "", email: "", preferred_renter_id: "", notes: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const c = await base44.entities.Client.list("-last_visit_date");
      setClients(c);
      setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load clients. Pull down to retry.');
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (form.id) {
        await base44.entities.Client.update(form.id, form);
        toast({ title: "Client updated" });
      } else {
        await base44.entities.Client.create(form);
        toast({ title: "Client added" });
      }
      setShowAdd(false);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try {
      await base44.entities.Client.delete(id);
      toast({ title: "Client deleted" });
      loadData();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <p className="text-sm text-destructive text-center">{error}</p>
      <button onClick={loadData} className="text-xs text-primary underline">Try again</button>
    </div>
  );

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  const newThisMonth = clients.filter(c => {
    const visitDate = c.last_visit_date ? new Date(c.last_visit_date) : null;
    const now = new Date();
    return visitDate && visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
  }).length;
  const avgVisits = clients.length > 0 ? (clients.reduce((s, c) => s + (c.visit_count || 0), 0) / clients.length).toFixed(1) : 0;
  const topSpender = clients.length > 0 ? clients.reduce((max, c) => (c.total_spent || 0) > (max.total_spent || 0) ? c : max) : null;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Clients</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Client Directory</h1>
          </div>
          <GoldButton onClick={() => { setForm(emptyForm); setShowAdd(true); }}><Plus className="w-4 h-4" />Add Client</GoldButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Clients" value={clients.length} accent glow />
          <KpiCard label="New This Month" value={newThisMonth} />
          <KpiCard label="Avg Visits" value={avgVisits} />
          <KpiCard label="Top Spender" value={topSpender ? formatCurrency(topSpender.total_spent) : "$0"} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">No clients found.</p>
              {search && <button onClick={() => setSearch("")} className="text-xs text-primary underline">Clear search</button>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => {
                const loyalty = (c.visit_count || 0) >= 10 ? "Gold" : (c.visit_count || 0) >= 5 ? "Silver" : "Bronze";
                const loyaltyColor = loyalty === "Gold" ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" : loyalty === "Silver" ? "bg-slate-500/15 text-slate-600 dark:text-slate-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                return (
                  <div key={c.id} className="px-5 py-4 flex items-start justify-between hover:bg-muted/20 gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.phone || c.email || "—"}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", loyaltyColor)}>{loyalty}</span>
                        {c.last_visit_date && <span className="text-[10px] text-muted-foreground">{c.visit_count || 0} visits · {formatCurrency(c.total_spent)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => { setForm(c); setShowAdd(true); }}>Edit</Button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{form.id ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="min-h-[44px]"
              autoFocus
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="min-h-[44px]"
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="min-h-[44px]"
            />
            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="min-h-[44px]"
            />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowAdd(false)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}