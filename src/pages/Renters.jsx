import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, freqLabel, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton";
import StatusBadge from "@/components/ui/StatusBadge";
import SplitBar from "@/components/ui/SplitBar";
import PullToRefresh from "@/components/PullToRefresh";

const emptyForm = { name: "", role: "Stylist", rent_amount: "", frequency: "weekly", status: "active", commission_owner: 40, notes: "", user_email: "" };

export default function Renters() {
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRenter, setEditRenter] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const r = await base44.entities.Renter.list();
    setRenters(r); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setForm(emptyForm); setEditRenter(null); setShowAdd(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditRenter(r); setShowAdd(true); };

  const handleSave = async () => {
    if (!form.name || !form.rent_amount) return;
    setSaving(true);
    const data = { ...form, rent_amount: parseFloat(form.rent_amount) || 0, commission_owner: parseFloat(form.commission_owner) || 40 };
    if (editRenter) await base44.entities.Renter.update(editRenter.id, data);
    else await base44.entities.Renter.create(data);
    setShowAdd(false); setSaving(false); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Team</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Stylists</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{renters.filter(r => r.status === "active").length} active</p>
          </div>
          <GoldButton onClick={openAdd}><Plus className="w-4 h-4" />Add Stylist</GoldButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renters.map((r, i) => {
            const av = getAvatarColor(i);
            const renterPct = 100 - (r.commission_owner || 40);
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", av.bg, av.text)}>
                      {getInitials(r.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.role || "Stylist"}</p>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Rent</span>
                    <span className="font-mono font-semibold">{formatCurrency(r.rent_amount)} / {freqLabel(r.frequency)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Split (owner / stylist)</span>
                    <span className="font-mono">{r.commission_owner}% / {renterPct}%</span>
                  </div>
                  <SplitBar ownerPct={r.commission_owner || 40} />
                </div>

                {r.user_email && <p className="text-[10px] text-muted-foreground truncate">{r.user_email}</p>}

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(r)}>
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => base44.entities.Renter.delete(r.id).then(loadData)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editRenter ? "Edit Stylist" : "Add Stylist"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <Input placeholder="Role (e.g. Stylist, Nail Tech)" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            <div className="flex gap-2">
              <Input type="number" placeholder="Rent Amount *" value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} className="font-mono flex-1" min="0" />
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-muted-foreground w-28 shrink-0">Owner Commission %</label>
              <Input type="number" value={form.commission_owner} onChange={e => setForm(f => ({ ...f, commission_owner: e.target.value }))} className="font-mono" min="0" max="100" />
            </div>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Linked User Email (optional)" value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.rent_amount}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}