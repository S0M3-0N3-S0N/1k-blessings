import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, freqMultiplier, cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function ChargesLedger({ charges, renters, currency, onRefresh }) {
  const [filterRenter, setFilterRenter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: '', renter_id: '', amount: '', frequency: 'monthly' });
  const [loadingAdd, setLoadingAdd] = useState(false);

  const filtered = filterRenter === "all" ? charges : charges.filter(c => c.renter_id === filterRenter);
  const filteredTotal = filtered.reduce((s, c) => s + (c.amount || 0) * freqMultiplier(c.frequency), 0);

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    setLoadingAdd(true);
    // Optimistic update
    const optimisticCharge = {
      id: `temp-${Date.now()}`,
      description: form.description,
      renter_id: form.renter_id || null,
      amount: parseFloat(form.amount) || 0,
      frequency: form.frequency,
    };
    // We call onRefresh which will re-fetch, but first close the form
    setForm({ description: '', renter_id: '', amount: '', frequency: 'monthly' });
    setAdding(false);
    await base44.entities.Charge.create({
      description: optimisticCharge.description,
      renter_id: optimisticCharge.renter_id,
      amount: optimisticCharge.amount,
      frequency: optimisticCharge.frequency,
    });
    setLoadingAdd(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.Charge.delete(id);
    onRefresh();
  };

  const getRenterName = (id) => {
    const r = renters.find(r => r.id === id);
    return r ? r.name : '—';
  };

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold">Rent & Charges Ledger</h3>
        <div className="flex items-center gap-2">
          <Select value={filterRenter} onValueChange={setFilterRenter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Filter by renter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Renters</SelectItem>
              {renters.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name || 'Unnamed'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Renter</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Freq</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total/mo</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No charges yet — add one to get started.
                </td>
              </tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 font-medium">{c.description}</td>
                <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{getRenterName(c.renter_id)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatCurrency(c.amount || 0, currency)}</td>
                <td className="px-3 py-3 text-right text-muted-foreground capitalize hidden sm:table-cell">{c.frequency}</td>
                <td className="px-3 py-3 text-right font-mono font-medium text-emerald-600">
                  {formatCurrency((c.amount || 0) * freqMultiplier(c.frequency), currency)}
                </td>
                <td className="px-2 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t border-border">
                <td colSpan={4} className="px-5 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Filtered total
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-primary text-base">
                  {formatCurrency(filteredTotal, currency)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {adding && (
        <div className="p-4 border-t border-border bg-muted/30 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-8 text-xs col-span-2 sm:col-span-1" autoFocus />
            <Select value={form.renter_id || 'none'} onValueChange={v => setForm({ ...form, renter_id: v === 'none' ? '' : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Renter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No renter</SelectItem>
                {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-8 text-xs font-mono" min="0" step="0.01" />
            <div className="flex gap-2">
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={loadingAdd || !form.description || !form.amount}>
              {loadingAdd ? 'Adding...' : 'Add Charge'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}