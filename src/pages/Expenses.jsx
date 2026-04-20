import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";

const CATS = ["supplies", "cleaning", "software", "utilities", "marketing", "other"];
const CAT_COLORS = {
  supplies: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  cleaning: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  software: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  utilities: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  marketing: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

const emptyForm = { description: "", amount: "", category: "other", expense_date: new Date().toISOString().split("T")[0], notes: "" };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  const loadData = useCallback(async () => {
    const e = await base44.entities.Expense.list("-expense_date");
    setExpenses(e); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.expense_date) return;
    setSaving(true);
    await base44.entities.Expense.create({ ...form, amount: parseFloat(form.amount) || 0 });
    setShowAdd(false); setForm(emptyForm); setSaving(false); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const now = new Date();
  const currentM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastM = (() => { const d = new Date(now); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const ytdYear = String(now.getFullYear());
  const thisMonth = expenses.filter(e => e.expense_date?.startsWith(currentM)).reduce((s, e) => s + (e.amount || 0), 0);
  const lastMonth = expenses.filter(e => e.expense_date?.startsWith(lastM)).reduce((s, e) => s + (e.amount || 0), 0);
  const ytd = expenses.filter(e => e.expense_date?.startsWith(ytdYear)).reduce((s, e) => s + (e.amount || 0), 0);

  // Group by month
  const grouped = expenses.reduce((acc, e) => {
    const m = e.expense_date?.slice(0, 7) || "unknown";
    if (!acc[m]) acc[m] = [];
    acc[m].push(e);
    return acc;
  }, {});
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggle = (m) => setExpanded(p => ({ ...p, [m]: !p[m] }));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Finance</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Expenses</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track your salon operating costs</p>
          </div>
          <GoldButton onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />Add Expense</GoldButton>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="This Month" value={formatCurrency(thisMonth)} accent />
          <KpiCard label="Last Month" value={formatCurrency(lastMonth)} />
          <KpiCard label="Year to Date" value={formatCurrency(ytd)} />
        </div>

        <div className="space-y-3">
          {sortedMonths.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No expenses recorded yet.</p>}
          {sortedMonths.map(m => {
            const items = grouped[m];
            const total = items.reduce((s, e) => s + (e.amount || 0), 0);
            const isOpen = expanded[m] !== false; // default open
            const [yr, mo] = m.split("-");
            const label = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
                  onClick={() => toggle(m)}>
                  <div className="flex items-center gap-3">
                    <p className="font-serif text-base font-medium">{label}</p>
                    <span className="text-xs text-muted-foreground">{items.length} expense{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-destructive">−{formatCurrency(total)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {items.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", CAT_COLORS[e.category] || CAT_COLORS.other)}>
                            {e.category}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{e.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.expense_date ? new Date(e.expense_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                              {e.notes && ` · ${e.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-destructive">−{formatCurrency(e.amount)}</span>
                          <button onClick={() => base44.entities.Expense.delete(e.id).then(loadData)}
                            className="text-muted-foreground hover:text-destructive transition-colors">
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
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-9" autoFocus />
            <div className="flex gap-2">
              <Input type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-9 font-mono flex-1" min="0" step="0.01" />
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="h-9" />
            <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-9" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setShowAdd(false)}>Cancel</Button>
              <GoldButton className="flex-1 h-9" onClick={handleSave} disabled={saving || !form.description || !form.amount || !form.expense_date}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}