import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Search, AlertCircle, Gift, Pencil, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const emptyForm = { name: "", phone: "", email: "", birthday: "", preferred_renter_id: "", notes: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStylist, setFilterStylist] = useState("all");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [c, r] = await Promise.all([
        base44.entities.Client.list("-last_visit_date"),
        base44.entities.Renter.filter({ status: "active" }),
      ]);
      setClients(c);
      setRenters(r);
      setLoading(false);
    } catch (err) {
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
        toast({ title: t("clientUpdated") });
      } else {
        await base44.entities.Client.create(form);
        toast({ title: t("clientAdded") });
      }
      setShowAdd(false);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      toast({ title: t("saveFailed"), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("deleteClient"))) return;
    try {
      await base44.entities.Client.delete(id);
      toast({ title: t("clientDeleted") });
      loadData();
    } catch (err) {
      toast({ title: t("deleteFailed"), description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-destructive text-center">{error}</p>
      <button onClick={loadData} className="text-xs text-primary underline">{t("retry")}</button>
    </div>
  );

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const saveNote = async (clientId) => {
    await base44.entities.Client.update(clientId, { notes: noteText });
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: noteText } : c));
    setEditingNoteId(null);
  };

  const filtered = clients
    .filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(c => filterStylist === "all" || c.preferred_renter_id === filterStylist);
  const newThisMonth = clients.filter(c => {
    const visitDate = c.last_visit_date ? new Date(c.last_visit_date) : null;
    const now = new Date();
    return visitDate && visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
  }).length;
  const avgVisits = clients.length > 0 ? (clients.reduce((s, c) => s + (c.visit_count || 0), 0) / clients.length).toFixed(1) : 0;
  const topSpender = clients.length > 0 ? clients.reduce((max, c) => (c.total_spent || 0) > (max.total_spent || 0) ? c : max) : null;

  // Birthday this month check
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const birthdaysThisMonth = clients.filter(c => c.birthday?.slice(5, 7) === currentMonth);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("clients")}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("clientDirectory")}</h1>
          </div>
          <GoldButton onClick={() => { setForm(emptyForm); setShowAdd(true); }}><Plus className="w-4 h-4" />{t("addClient")}</GoldButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t("totalClients")} value={clients.length} accent glow />
          <KpiCard label={t("newThisMonth")} value={newThisMonth} />
          <KpiCard label={t("avgVisits")} value={avgVisits} />
          <KpiCard label={t("topSpender")} value={topSpender ? formatCurrency(topSpender.total_spent) : "$0"} />
        </div>

        {/* Birthdays this month */}
        {birthdaysThisMonth.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Birthdays this month 🎂</p>
              <p className="text-xs text-foreground/80">{birthdaysThisMonth.map(c => c.name).join(", ")}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("searchClients")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 min-h-[44px]"
            />
          </div>
          {renters.length > 0 && (
            <Select value={filterStylist} onValueChange={setFilterStylist}>
              <SelectTrigger className="w-40 min-h-[44px]"><SelectValue placeholder="All Stylists" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stylists</SelectItem>
                {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">{t("noClientsFound")}</p>
              {search && <button onClick={() => setSearch("")} className="text-xs text-primary underline">{t("clearSearch")}</button>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => {
                const loyalty = (c.visit_count || 0) >= 10 ? "Gold" : (c.visit_count || 0) >= 5 ? "Silver" : "Bronze";
                const loyaltyColor = loyalty === "Gold" ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" : loyalty === "Silver" ? "bg-slate-500/15 text-slate-600 dark:text-slate-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                const hasBirthdayThisMonth = c.birthday?.slice(5, 7) === currentMonth;
                return (
                  <div key={c.id} className="px-5 py-4 flex items-start justify-between hover:bg-muted/20 gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{c.name}</p>
                        {hasBirthdayThisMonth && <span title="Birthday this month">🎂</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {c.phone && <p>{c.phone}</p>}
                        {c.email && <p>{c.email}</p>}
                        {c.birthday && <p>🎂 {new Date(c.birthday + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", loyaltyColor)}>{loyalty}</span>
                        {c.last_visit_date && <span className="text-[10px] text-muted-foreground">{c.visit_count || 0} visits · {formatCurrency(c.total_spent)}</span>}
                        {c.preferred_renter_id && renterMap[c.preferred_renter_id] && (
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">✂ {renterMap[c.preferred_renter_id].name}</span>
                        )}
                      </div>
                      {/* Notes */}
                      {editingNoteId === c.id ? (
                        <div className="mt-2 space-y-1">
                          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full text-xs border border-border rounded-lg p-2 bg-muted/30 resize-none min-h-[60px]" />
                          <div className="flex gap-1">
                            <button onClick={() => saveNote(c.id)} className="text-xs text-primary hover:underline flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
                            <button onClick={() => setEditingNoteId(null)} className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                          </div>
                        </div>
                      ) : c.notes ? (
                        <div className="mt-2 bg-muted/30 rounded-lg p-2 text-xs text-muted-foreground border border-border/50 flex items-start justify-between gap-2">
                          <span className="leading-relaxed">{c.notes}</span>
                          <button onClick={() => { setEditingNoteId(c.id); setNoteText(c.notes); }} className="shrink-0 text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!c.notes && editingNoteId !== c.id && (
                        <button onClick={() => { setEditingNoteId(c.id); setNoteText(""); }} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => { setForm(c); setShowAdd(true); }}>{t("edit")}</Button>
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
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? t("editClient") : t("addClient")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder={`${t("fullName")} *`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="min-h-[44px]" autoFocus />
            <Input placeholder={t("phone")} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="min-h-[44px]" />
            <Input type="email" placeholder={t("email")} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="min-h-[44px]" />
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Birthday (optional)</label>
              <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="min-h-[44px]" />
            </div>
            <Input placeholder={`${t("notes")} (${t("optional")})`} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[44px]" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowAdd(false)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}