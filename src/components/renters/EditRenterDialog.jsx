import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function EditRenterDialog({ renter, open, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (renter) {
      setForm({
        name: renter.name || '',
        role: renter.role || '',
        rent_amount: renter.rent_amount || 0,
        frequency: renter.frequency || 'monthly',
        status: renter.status || 'active',
        commission_owner: renter.commission_owner ?? 100,
      });
    }
  }, [renter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!renter) return;
    setLoading(true);
    await base44.entities.Renter.update(renter.id, {
      ...form,
      rent_amount: parseFloat(form.rent_amount) || 0,
    });
    setLoading(false);
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Renter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Input value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} className="h-9" placeholder="e.g. Nail Tech, Barber" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Rent Amount</Label>
              <Input type="number" value={form.rent_amount || ''} onChange={e => setForm({ ...form, rent_amount: e.target.value })} className="h-9 font-mono" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frequency</Label>
              <Select value={form.frequency || 'monthly'} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Commission Split</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.commission_owner ?? 100}
                onChange={e => setForm({ ...form, commission_owner: parseFloat(e.target.value) || 0 })}
                className="h-9 font-mono"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Owner {form.commission_owner ?? 100}% / Renter {100 - (form.commission_owner ?? 100)}%
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 h-9">{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}