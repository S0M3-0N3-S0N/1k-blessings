import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const CATS = ["supplies", "cleaning", "software", "utilities", "marketing", "equipment", "other"];
const CAT_COLORS = {
  supplies: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  cleaning: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  software: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  utilities: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  marketing: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  equipment: "bg-stone-500/15 text-stone-500 border-stone-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

const emptyForm = { description: "", amount: "", category: "other", expense_date: new Date().toISOString().split("T")[0], paid_by: "salon", receipt_note: "", notes: "" };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [monthOffset, setMonthOffset] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    const e = await base44.entities.Expense.list("-expense_date");
    setExpenses(e); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.expense_date) return;
    setSaving(true);
    await base44.entities.Expense.create({ ...form, amount: parseFloat(form.amount) || 0 });
    setShowAdd(false); setForm(emptyForm); setSaving(false);
    toast({ title: t("addExpense") }); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const currentM = `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, "0")}`;
  const prevM = (() => { const d = new Date(displayDate); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const ytdYear = String(now.getFullYear());

  const thisMonth = expenses.filter(e => e.expense_date?.startsWith(currentM)).reduce((s, e) => s + (e.amount || 0), 0);
  const lastMonth = expenses.filter(e => e.expense_date?.startsWith(prevM)).reduce((s, e) => s + (e.amount || 0), 0);
  const ytd = expenses.filter(e => e.expense_date?.startsWith(ytdYear)).reduce((s, e) => s + (e.amount || 0), 0);

  // Category breakdown for current month
  const catBreakdown = CATS.map(cat => {
    const total = expenses.filter(e => e.expense_date?.startsWith(currentM) && e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
    return { cat, total };
  }).filter(x => x.total > 0);

  // Group by month
  const grouped = expenses.reduce((acc, e) => {
    const m = e.expense_date?.slice(0, 7) || "unknown";
    if (!acc[m]) acc[m] = [];
    acc[m].push(e);
    return acc;
  }, {});
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const toggle = (m) => setExpanded(p => ({ ...p, [m]: !p[m] }));
  const monthLabel = displayDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Finance</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("expensesTitle")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-2 rounded-lg border border-border hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-muted-foreground min-w-[100px] text-center">{monthLabel}</span>
            <button onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <KpiCard label={t("thisMonthTotal")} value={formatCurrency(thisMonth)} accent />
            <KpiCard label={t("lastMonthTotal")} value={formatCurrency(lastMonth)} />
            <KpiCard label={t("ytd")} value={formatCurrency(ytd)} />
          </div>
          <GoldButton onClick={() => setShowAdd(true)} className="shrink-0"><Plus className="w-4 h-4" />{t("addExpense")}</GoldButton>
        </div>

        {/* Category Breakdown */}
        {catBreakdown.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Category Breakdown · {monthLabel}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {catBreakdown.map(({ cat, total }) => (
                <div key={cat} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium", CAT_COLORS[cat] || CAT_COLORS.other)}>
                  <span className="capitalize">{cat}</span>
                  <span className="font-mono font-semibold">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div className="space-y-3">
          {sortedMonths.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">{t("noExpenses") || "No expenses recorded yet."}</p>}
          {sortedMonths.map(m => {
            const items = grouped[m];
            const total = items.reduce((s, e) => s + (e.amount || 0), 0);
            const isOpen = expanded[m] !== false;
            const [yr, mo] = m.split("-").map(Number);
            const label = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                <button className="w-full flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 hover:bg-muted/20 transition-colors min-h-[56px] gap-2" onClick={() => toggle(m)}>
                  <div className="flex items-center gap-3">
                    <p className="font-serif text-base font-medium">{label}</p>
                    <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-destructive">−{formatCurrency(total)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {items.map(e => (
                       <div key={e.id} className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-3 hover:bg-muted/20 min-h-[52px] gap-2">
                         <div className="flex items-center gap-3 min-w-0">
                           <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", CAT_COLORS[e.category] || CAT_COLORS.other)}>
                             {e.category}
                           </span>
                           <div className="min-w-0">
                             <p className="text-sm font-medium truncate">{e.description}</p>
                             <p className="text-xs text-muted-foreground truncate">
                               {e.expense_date ? new Date(e.expense_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                               {e.notes && ` · ${e.notes}`}
                               {e.paid_by === "owner" && ` · ${t("paidByOwner") || "paid by owner"}`}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3 justify-between md:justify-normal">
                           <span className="font-mono text-sm font-semibold text-destructive">−{formatCurrency(e.amount)}</span>
                           <button onClick={() => base44.entities.Expense.delete(e.id).then(() => { toast({ title: t("delete") }); loadData(); })} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("addExpense")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[44px]" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="min-h-[44px] font-mono" min="0" step="0.01" />
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="min-h-[44px]" />
              <Select value={form.paid_by} onValueChange={v => setForm(f => ({ ...f, paid_by: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salon">{t("paidBySalon") || "Paid by Salon"}</SelectItem>
                  <SelectItem value="owner">{t("paidByOwner2") || "Paid by Owner"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Receipt note (optional)" value={form.receipt_note} onChange={e => setForm(f => ({ ...f, receipt_note: e.target.value }))} className="min-h-[44px]" />
            <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[44px]" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowAdd(false)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.description || !form.amount || !form.expense_date}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}