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

  const filtered = filterRenter === "all" ? charges : charges.filter((c) => c.renter_id === filterRenter);
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
      frequency: form.frequency
    };
    // We call onRefresh which will re-fetch, but first close the form
    setForm({ description: '', renter_id: '', amount: '', frequency: 'monthly' });
    setAdding(false);
    await base44.entities.Charge.create({
      description: optimisticCharge.description,
      renter_id: optimisticCharge.renter_id,
      amount: optimisticCharge.amount,
      frequency: optimisticCharge.frequency
    });
    setLoadingAdd(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.Charge.delete(id);
    onRefresh();
  };

  const getRenterName = (id) => {
    const r = renters.find((r) => r.id === id);
    return r ? r.name : '—';
  };

  return null;











































































































}