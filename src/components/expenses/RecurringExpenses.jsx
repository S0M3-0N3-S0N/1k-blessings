import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Trash2, RefreshCw, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { useToast } from "@/components/ui/use-toast";

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

const emptyTemplate = { description: "", amount: "", category: "other", paid_by: "salon", day_of_month: "1" };

export default function RecurringExpenses({ currentMonth, onApplied }) {
  const [templates, setTemplates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyTemplate);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const [r, e] = await Promise.all([
      base44.entities.Expense.filter({ is_recurring: true }),
      base44.entities.Expense.filter({ is_recurring: false }),
    ]);
    // templates = recurring expense definitions
    setTemplates(r);
    setExpenses(e);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    await base44.entities.Expense.create({
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      paid_by: form.paid_by,
      is_recurring: true,
      expense_date: `${currentMonth}-${String(form.day_of_month).padStart(2, "0")}`,
      notes: `Recurring · Day ${form.day_of_month}`,
    });
    setForm(emptyTemplate);
    setShowAdd(false);
    setSaving(false);
    toast({ title: "Recurring expense added" });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Expense.delete(id);
    toast({ title: "Deleted" });
    load();
  };

  // Apply all recurring templates to the current month (skip already applied ones)
  const applyToMonth = async (template) => {
    const day = template.notes?.match(/Day (\d+)/)?.[1] || "1";
    const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
    // Check if already applied this month
    const alreadyApplied = expenses.some(
      e => !e.is_recurring && e.expense_date === dateStr && e.description === template.description && e.amount === template.amount
    );
    if (alreadyApplied) {
      toast({ title: "Already applied this month", description: template.description });
      return;
    }
    setApplying(template.id);
    await base44.entities.Expense.create({
      description: template.description,
      amount: template.amount,
      category: template.category,
      paid_by: template.paid_by,
      expense_date: dateStr,
      is_recurring: false,
      notes: "From recurring",
    });
    setApplying(null);
    toast({ title: `${template.description} added to ${currentMonth}` });
    onApplied();
    load();
  };

  const applyAll = async () => {
    for (const t of templates) {
      await applyToMonth(t);
    }
  };

  const [yr, mo] = currentMonth.split("-").map(Number);
  const monthLabel = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-0">
      {/* Apply all banner */}
      {templates.length > 0 && (
        <div className="py-3 bg-primary/5 rounded-xl border border-primary/20 px-4 flex items-center justify-between gap-3 mb-3">
          <p className="text-xs text-muted-foreground">Apply all to <span className="font-semibold text-foreground">{monthLabel}</span></p>
          <GoldButton size="sm" onClick={applyAll}>
            <RefreshCw className="w-3.5 h-3.5" /> Apply All
          </GoldButton>
        </div>
      )}

      {/* Template list */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {templates.length === 0 && !showAdd && (
          <p className="text-xs text-muted-foreground text-center py-6">No recurring expenses yet</p>
        )}
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 min-h-[52px] bg-card">
            <div className="flex items-center gap-3">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", CAT_COLORS[t.category] || CAT_COLORS.other)}>
                {t.category}
              </span>
              <div>
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatCurrency(t.amount)} / mo</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyToMonth(t)}
                disabled={applying === t.id}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
              >
                {applying === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Apply
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add template form */}
      {showAdd ? (
        <div className="pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Recurring Expense</p>
          <Input placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[44px]" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Amount *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="min-h-[44px] font-mono" min="0" step="0.01" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Day of month</label>
              <Input type="number" min="1" max="28" value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} className="min-h-[44px] font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Paid by</label>
              <Select value={form.paid_by} onValueChange={v => setForm(f => ({ ...f, paid_by: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salon">Salon</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => { setShowAdd(false); setForm(emptyTemplate); }}>Cancel</Button>
            <GoldButton className="flex-1" onClick={handleAdd} disabled={saving || !form.description || !form.amount}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </GoldButton>
          </div>
        </div>
      ) : (
        <div className="pt-3">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium min-h-[40px]">
            <Plus className="w-4 h-4" /> Add recurring expense
          </button>
        </div>
      )}
    </div>
  );
}