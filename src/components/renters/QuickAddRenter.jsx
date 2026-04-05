import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const AVATAR_COLORS = [
  '#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#38BDF8', '#FB923C', '#2DD4BF',
];

export default function QuickAddRenter({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: '',
    rent_amount: '',
    frequency: 'monthly',
    commission_owner: 100,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.rent_amount) return;
    setLoading(true);
    await base44.entities.Renter.create({
      name: form.name,
      role: form.role || 'Chair',
      rent_amount: parseFloat(form.rent_amount) || 0,
      frequency: form.frequency,
      status: 'active',
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      commission_owner: parseFloat(form.commission_owner) || 100,
    });
    setForm({ name: '', role: '', rent_amount: '', frequency: 'monthly', commission_owner: 100 });
    setOpen(false);
    setLoading(false);
    onAdded();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-2 bg-card rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 p-6 min-h-[160px] cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">Quick Add Renter</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-xl border-2 border-primary/20 p-4 space-y-3 animate-fade-in"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">New Renter</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)} type="button">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        autoFocus
        className="h-9 text-sm"
      />
      <Input
        placeholder="Role (e.g. Nail Tech, Barber)"
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        className="h-9 text-sm"
      />
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Rent amount"
          value={form.rent_amount}
          onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
          className="h-9 text-sm font-mono flex-1"
          min="0"
          step="0.01"
        />
        <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
          <SelectTrigger className="h-9 w-[120px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">Commission Split (Owner % / Renter %)</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Owner %"
            value={form.commission_owner}
            onChange={(e) => setForm({ ...form, commission_owner: e.target.value })}
            className="h-9 text-sm font-mono"
            min="0"
            max="100"
            step="1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Renter gets {100 - (parseFloat(form.commission_owner) || 0)}%
          </span>
        </div>
      </div>
      <Button type="submit" disabled={loading || !form.name || !form.rent_amount}
      className="w-full h-9 text-sm">
        {loading ? 'Adding...' : 'Add Renter'}
      </Button>
    </form>
  );
}