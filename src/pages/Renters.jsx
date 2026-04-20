import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, freqLabel, freqMultiplier, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoldButton from "@/components/ui/GoldButton";
import StatusBadge from "@/components/ui/StatusBadge";
import ModelBadge from "@/components/ui/ModelBadge.jsx";
import ModelToggle from "@/components/ui/ModelToggle.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { getWeekStart, getWeekEnd, formatDateRange } from "@/lib/utils";

const emptyForm = { name: "", role: "Stylist", payment_model: "rent", rent_amount: "", frequency: "weekly", commission_owner: 40, status: "active", notes: "", user_email: "" };

function RenterForm({ form, setForm, onSave, onCancel, saving }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Payment Model</label>
        <ModelToggle value={form.payment_model} onChange={v => setForm(f => ({ ...f, payment_model: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Name *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Role</label>
          <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Hair Stylist, Nail Tech" />
        </div>
      </div>

      {form.payment_model === "rent" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Rent Amount *</label>
            <Input type="number" value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} className="font-mono" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Frequency</label>
            <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Owner Commission %</label>
          <Input type="number" value={form.commission_owner} onChange={e => setForm(f => ({ ...f, commission_owner: parseFloat(e.target.value) || 0 }))} className="font-mono" min="0" max="100" />
          <p className="text-xs text-muted-foreground mt-1">Stylist keeps {100 - (parseFloat(form.commission_owner) || 0)}%</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Status</label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Linked Email</label>
          <Input value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} placeholder="user@email.com" />
        </div>
      </div>
      <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <GoldButton className="flex-1" onClick={onSave} disabled={saving || !form.name}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Stylist"}
        </GoldButton>
      </div>
    </div>
  );
}

export default function Renters() {
  const [renters, setRenters] = useState([]);
  const [charges, setCharges] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRenter, setEditRenter] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadData = useCallback(async () => {
    const [r, c, s] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.Charge.list(),
      base44.entities.ServiceEntry.list(),
    ]);
    setRenters(r); setCharges(c); setServices(s); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setForm(emptyForm); setEditRenter(null); setShowAdd(true); };
  const openEdit = (r) => { setForm({ ...r, rent_amount: r.rent_amount || "", commission_owner: r.commission_owner ?? 40 }); setEditRenter(r); setShowAdd(true); };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = {
      ...form,
      rent_amount: form.payment_model === "rent" ? (parseFloat(form.rent_amount) || 0) : 0,
      commission_owner: form.payment_model === "commission" ? (parseFloat(form.commission_owner) || 40) : 40,
    };
    if (editRenter) await base44.entities.Renter.update(editRenter.id, data);
    else await base44.entities.Renter.create(data);
    setShowAdd(false); setSaving(false); loadData();
  };

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const activeRenters = renters.filter(r => r.status === "active");
  const commissionRenters = activeRenters.filter(r => r.payment_model === "commission");
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);

  const weekOptions = ["This Week", "Last Week", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"];

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Team</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">Stylists & Payroll</h1>
        </div>

        <Tabs defaultValue="stylists">
          <TabsList className="mb-5">
            <TabsTrigger value="stylists">Stylists</TabsTrigger>
            <TabsTrigger value="splits">Weekly Splits</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          {/* TAB 1 — Stylists */}
          <TabsContent value="stylists">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {renters.map((r, i) => {
                const av = getAvatarColor(i);
                return (
                  <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4 group relative">
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
                      <div className="flex items-center gap-1.5">
                        <ModelBadge model={r.payment_model} />
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    {r.payment_model === "rent" ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rent</span>
                          <span className="font-mono font-semibold">{formatCurrency(r.rent_amount)} / {freqLabel(r.frequency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly equiv.</span>
                          <span className="font-mono">{formatCurrency((r.rent_amount || 0) * freqMultiplier(r.frequency))}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Split (owner / stylist)</span>
                          <span className="font-mono">{r.commission_owner || 40}% / {100 - (r.commission_owner || 40)}%</span>
                        </div>
                        <SplitBar ownerPct={r.commission_owner || 40} />
                      </div>
                    )}

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

              {/* Add card */}
              <button onClick={openAdd} className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary min-h-[160px]">
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Add Stylist</span>
              </button>
            </div>
          </TabsContent>

          {/* TAB 2 — Weekly Splits */}
          <TabsContent value="splits">
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
                Showing commission-model stylists only. Rent-model stylists are tracked in Payments.
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm font-medium">{formatDateRange(ws)}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                  <select className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5" value={weekOffset} onChange={e => setWeekOffset(Number(e.target.value))}>
                    {weekOptions.map((label, i) => <option key={i} value={i}>{label}</option>)}
                  </select>
                  <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              {commissionRenters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No commission-model stylists yet.</p>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border">
                          {["Stylist","Role","Services","Total Earned","Their % → $","Our % → $","Split"].map(h => (
                            <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Stylist" || h === "Role" ? "text-left" : "text-right"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {commissionRenters.map(r => {
                          const rs = weekServices.filter(s => s.renter_id === r.id);
                          const gross = rs.reduce((s,e) => s+(e.amount||0), 0);
                          const ownerCut = rs.reduce((s,e) => s+(e.owner_earnings||0), 0);
                          const stylistCut = rs.reduce((s,e) => s+(e.renter_earnings||0), 0);
                          const ownerPct = r.commission_owner || 40;
                          return (
                            <tr key={r.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">{r.name}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{r.role}</td>
                              <td className="px-4 py-3 text-right">{rs.length}</td>
                              <td className="px-4 py-3 text-right font-mono">{formatCurrency(gross)}</td>
                              <td className="px-4 py-3 text-right font-mono">{100-ownerPct}% → {formatCurrency(stylistCut)}</td>
                              <td className="px-4 py-3 text-right font-mono text-primary">{ownerPct}% → {formatCurrency(ownerCut)}</td>
                              <td className="px-4 py-3 w-24"><SplitBar ownerPct={ownerPct} /></td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/20 border-t border-border font-semibold">
                          <td className="px-4 py-3" colSpan={2}>Totals</td>
                          <td className="px-4 py-3 text-right">{commissionRenters.reduce((s,r) => { const rs=weekServices.filter(x=>x.renter_id===r.id); return s+rs.length; }, 0)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRenters.reduce((s,r) => s+weekServices.filter(x=>x.renter_id===r.id).reduce((a,e)=>a+(e.amount||0),0), 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRenters.reduce((s,r) => s+weekServices.filter(x=>x.renter_id===r.id).reduce((a,e)=>a+(e.renter_earnings||0),0), 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(commissionRenters.reduce((s,r) => s+weekServices.filter(x=>x.renter_id===r.id).reduce((a,e)=>a+(e.owner_earnings||0),0), 0))}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3 — User Management */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
                Tip: Enter the stylist's registered app email in the "Linked Email" field to connect their account.
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      {["Stylist","Model","Linked Email","Rate","Status",""].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {renters.map(r => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3"><ModelBadge model={r.payment_model} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{r.user_email || <span className="italic opacity-50">not linked</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {r.payment_model === "rent" ? formatCurrency(r.rent_amount) + "/" + freqLabel(r.frequency) : `${r.commission_owner||40}% owner`}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(r)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Charges Ledger */}
        <ChargesSection charges={charges} renters={renters} onRefresh={loadData} />
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editRenter ? "Edit Stylist" : "Add Stylist"}</DialogTitle></DialogHeader>
          <RenterForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setShowAdd(false)} saving={saving} />
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}

function ChargesSection({ charges, renters, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", renter_id: "", amount: "", frequency: "monthly" });

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    await base44.entities.Charge.create({ ...form, amount: parseFloat(form.amount) || 0 });
    setForm({ description: "", renter_id: "", amount: "", frequency: "monthly" }); setShowAdd(false); onRefresh();
  };

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-serif text-base font-medium">Charges Ledger</h2>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(s => !s)}><Plus className="w-3.5 h-3.5 mr-1" />Add Charge</Button>
      </div>
      {showAdd && (
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap gap-2 items-end">
          <Input placeholder="Description *" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} className="flex-1 min-w-[140px] h-8 text-sm" />
          <Select value={form.renter_id} onValueChange={v => setForm(f=>({...f,renter_id:v}))}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Stylist" /></SelectTrigger>
            <SelectContent>{renters.map(r=><SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="$" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="w-24 h-8 text-sm font-mono" />
          <Select value={form.frequency} onValueChange={v=>setForm(f=>({...f,frequency:v}))}>
            <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <GoldButton size="sm" onClick={handleAdd}>Add</GoldButton>
        </div>
      )}
      {charges.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No recurring charges yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {charges.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20">
              <div>
                <p className="text-sm font-medium">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.renter_id ? renterMap[c.renter_id]?.name || "—" : "All"} · {freqLabel(c.frequency)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{formatCurrency(c.amount)}</span>
                <button onClick={() => base44.entities.Charge.delete(c.id).then(onRefresh)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronLeft({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>; }
function ChevronRight({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>; }