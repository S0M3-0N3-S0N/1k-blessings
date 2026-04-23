import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, freqLabel, freqMultiplier, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Pencil, Info, X, Search, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoldButton from "@/components/ui/GoldButton.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import ModelBadge from "@/components/ui/ModelBadge.jsx";
import ModelToggle from "@/components/ui/ModelToggle.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";
import UserLinker from "@/components/renters/UserLinker";

const emptyForm = {
  name: "", role: "Stylist", payment_model: "rent", rent_amount: "",
  frequency: "weekly", commission_owner: 40, hourly_wage: "", status: "active",
  phone: "", start_date: "", notes: "", user_email: ""
};

function RenterFormFields({ form, setForm }) {
  const { t } = useLanguage();
  const ownerPct = parseFloat(form.commission_owner) || 40;
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("paymentModel") || "Payment Model"}</label>
        <ModelToggle value={form.payment_model} onChange={(v) => setForm((f) => ({ ...f, payment_model: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("fullName")} *</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("fullName")} className="min-h-[44px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("role")}</label>
          <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Hair Stylist, Nail Tech..." className="min-h-[44px]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("phone")}</label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="min-h-[44px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("date")}</label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="min-h-[44px]" />
        </div>
      </div>
      {form.payment_model === "rent" &&
      <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("rentAmount") || "Rent Amount"}</label>
            <Input type="number" value={form.rent_amount} onChange={(e) => setForm((f) => ({ ...f, rent_amount: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("frequency")}</label>
            <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      {form.payment_model === "commission" &&
      <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("ownerCommissionPct") || "Owner Commission %"}</label>
          <Input type="number" value={form.commission_owner} onChange={(e) => setForm((f) => ({ ...f, commission_owner: e.target.value }))} className="font-mono min-h-[44px]" min="0" max="100" />
          <SplitBar ownerPct={ownerPct} showLabels className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{t("stylistKeeps") || "Stylist keeps"} {100 - ownerPct}%</p>
        </div>
      }
      {form.payment_model === "hourly" &&
      <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("hourly")} ($/hr)</label>
            <Input type="number" value={form.hourly_wage} onChange={(e) => setForm((f) => ({ ...f, hourly_wage: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("rentDeduction") || "Rent Deduction ($)"}</label>
              <Input type="number" value={form.rent_amount} onChange={(e) => setForm((f) => ({ ...f, rent_amount: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("frequency")}</label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("ownerCommissionPct") || "Owner Commission %"} <span className="text-muted-foreground/50 font-normal">(optional)</span></label>
            <Input type="number" value={form.commission_owner} onChange={(e) => setForm((f) => ({ ...f, commission_owner: e.target.value }))} className="font-mono min-h-[44px]" min="0" max="100" placeholder="0" />
            {parseFloat(form.commission_owner) > 0 &&
          <>
                <SplitBar ownerPct={parseFloat(form.commission_owner)} showLabels className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{t("stylistKeeps") || "Stylist keeps"} {100 - parseFloat(form.commission_owner)}%</p>
              </>
          }
          </div>
          {form.hourly_wage && <p className="text-xs text-muted-foreground">≈ {formatCurrency(parseFloat(form.hourly_wage || 0) * 40)}/wk gross (40h)</p>}
        </div>
      }
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("status")}</label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("active")}</SelectItem>
            <SelectItem value="inactive">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="min-h-[44px]" />
    </div>);

}

export default function Renters() {
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editRenter, setEditRenter] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => localStorage.getItem("renters-tip-dismissed") === "1");
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, c, s] = await Promise.all([
        base44.entities.Renter.list(),
        base44.entities.Charge.list(),
        base44.entities.ServiceEntry.list("-service_date", 500)
      ]);
      setRenters(r);
      setCharges(c);
      setServices(s);
      setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load data. Pull down to retry.');
      setLoading(false);
    }
  }, []);
  useEffect(() => {loadData();}, [loadData]);

  const openAdd = () => {setForm(emptyForm);setEditRenter(null);setShowDialog(true);};
  const openEdit = (r) => {setForm({ ...emptyForm, ...r, rent_amount: r.rent_amount || "", commission_owner: r.commission_owner ?? 40, hourly_wage: r.hourly_wage || "" });setEditRenter(r);setShowDialog(true);};

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        rent_amount: form.payment_model === "rent" || form.payment_model === "hourly" ? parseFloat(form.rent_amount) || 0 : 0,
        commission_owner: form.payment_model === "commission" || form.payment_model === "hourly" ? parseFloat(form.commission_owner) || 0 : 0,
        hourly_wage: form.payment_model === "hourly" ? parseFloat(form.hourly_wage) || 0 : 0
      };
      if (editRenter) {
        await base44.entities.Renter.update(editRenter.id, data);
        toast({ title: t("edit") });
      } else {
        await base44.entities.Renter.create(data);
        toast({ title: t("add") });
      }
      setShowDialog(false);
      loadData();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this stylist? This action cannot be undone.')) return;
    try {
      await base44.entities.Renter.delete(id);
      toast({ title: t("delete") });
      loadData();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
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

  const renterMap = Object.fromEntries(renters.map((r) => [r.id, r]));
  
  // Filter renters by search and model
  const filtered = renters.filter(r => {
    const q = search.toLowerCase();
    const nameMatch = r.name?.toLowerCase().includes(q) || r.role?.toLowerCase().includes(q) || false;
    const modelMatch = modelFilter === "all" || r.payment_model === modelFilter;
    const statusMatch = showInactive || r.status === "active";
    return nameMatch && modelMatch && statusMatch;
  });

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("stylists")}</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{t("stylists")}</h1>
        </div>

        {renters.length === 0 && !tipDismissed && (
          <div className="bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-foreground/80 space-y-1">
              <p className="font-semibold text-foreground">Getting started</p>
              <p>Add your first stylist by clicking <span className="font-semibold">Add Stylist</span> below. You can set their payment model — rent, commission, or hourly — and link them to a user account so they can log in.</p>
            </div>
            <button onClick={() => { setTipDismissed(true); localStorage.setItem("renters-tip-dismissed", "1"); }} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <Tabs defaultValue="stylists">
          <div className="mb-5 overflow-x-auto scrollbar-none">
            <TabsList className="h-auto md:flex-wrap inline-flex gap-2 bg-transparent border-b border-border rounded-none">
              <TabsTrigger value="stylists" className="min-h-[44px] rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary whitespace-nowrap">{t("stylists")}</TabsTrigger>
              <TabsTrigger value="users" className="min-h-[44px] rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary whitespace-nowrap">{t("userMgmt") || "Users"}</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1 — Stylists */}
          <TabsContent value="stylists">
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t("searchByNameOrRole") || "Search by name or role..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 min-h-[44px]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "rent", "commission", "hourly"].map(f => (
                    <button
                      key={f}
                      onClick={() => setModelFilter(f)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors min-h-[44px]", modelFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}
                    >
                      {f === "all" ? (t("allModels") || "All Models") : t(f)}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowInactive(!showInactive)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]", showInactive ? "bg-muted/60 text-foreground" : "bg-muted text-muted-foreground")}
                  >
                    {showInactive ? `✓ ${t("showInactive") || "Show Inactive"}` : (t("hideInactive") || "Hide Inactive")}
                  </button>
                </div>
              </div>

              {/* Renter Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p className="text-sm">{t("noStylistsMatch") || "No stylists match your filters."}</p>
                  </div>
                ) : (
                  filtered.map((r, i) => {
                const av = getAvatarColor(i);
                return (
                  <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4 relative group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", av.bg, av.text)}>
                          {getInitials(r.name)}
                        </div>
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.role || "Stylist"}</p>
                          {r.start_date && <p className="text-[10px] text-muted-foreground/60 mt-0.5">Since {new Date(r.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <ModelBadge model={r.payment_model} />
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    {r.payment_model === "rent" &&
                    <div className="space-y-1 text-xs border-t border-border pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("rent")}</span>
                          <span className="font-mono font-semibold">{formatCurrency(r.rent_amount)} / {freqLabel(r.frequency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">≈ {t("monthly")}</span>
                          <span className="font-mono text-muted-foreground">{formatCurrency((r.rent_amount || 0) * freqMultiplier(r.frequency))}</span>
                        </div>
                      </div>
                    }
                    {r.payment_model === "commission" &&
                    <div className="space-y-2 text-xs border-t border-border pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("owner")} / {t("stylist")} {t("split")}</span>
                          <span className="font-mono">{r.commission_owner || 40}% / {100 - (r.commission_owner || 40)}%</span>
                        </div>
                        <SplitBar ownerPct={r.commission_owner || 40} />
                      </div>
                    }
                    {r.payment_model === "hourly" &&
                    <div className="space-y-1 text-xs border-t border-border pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("hourlyRate") || "Hourly Rate"}</span>
                          <span className="font-mono font-semibold">{formatCurrency(r.hourly_wage)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("rentDeduction")}</span>
                          <span className="font-mono text-muted-foreground">−{formatCurrency(r.rent_amount)}/{freqLabel(r.frequency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">≈ {t("grossPerWeek") || "Gross/wk"}</span>
                          <span className="font-mono text-muted-foreground">{formatCurrency((r.hourly_wage || 0) * 40)}</span>
                        </div>
                        {r.commission_owner > 0 &&
                      <>
                            <div className="flex justify-between mt-1">
                              <span className="text-muted-foreground">{t("commissionSplits")}</span>
                              <span className="font-mono">{r.commission_owner}% / {100 - r.commission_owner}%</span>
                            </div>
                            <SplitBar ownerPct={r.commission_owner} />
                          </>
                      }
                      </div>
                    }

                    {r.notes && (
                      <div className="text-xs bg-muted/30 rounded-lg p-2 border border-border/50 leading-relaxed text-muted-foreground">
                        <p className="font-medium text-foreground mb-0.5">{t("notes")}</p>
                        {r.notes}
                      </div>
                    )}

                    <div className="flex items-center gap-2 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" className="flex-1 min-h-[44px]" onClick={() => openEdit(r)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />{t("edit")}
                      </Button>
                      <RenterCardActions renter={r} services={services} onDelete={handleDelete} />
                    </div>
                  </div>);
                  })
                )}

                <button onClick={openAdd} className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary min-h-[180px]">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">{t("addStylist") || "Add Stylist"}</span>
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 — User Management */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg px-4 py-3 text-xs text-muted-foreground border border-border">
                {t("linkAccountSubtitle")}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {renters.map((r, i) => {
                  const av = getAvatarColor(i);
                  return (
                    <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", av.bg, av.text)}>
                          {getInitials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.role || "Stylist"}</p>
                        </div>
                      </div>
                      <UserLinker
                        renter={r}
                        onLinked={(email) => {
                          setRenters((prev) => prev.map((x) => x.id === r.id ? { ...x, user_email: email } : x));
                        }} />
                      
                    </div>);

                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Charges Ledger */}
        <ChargesSection charges={charges} renters={renters} renterMap={renterMap} onRefresh={loadData} />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRenter ? t("edit") : t("addStylist") || "Add Stylist"}</DialogTitle></DialogHeader>
          <RenterFormFields form={form} setForm={setForm} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowDialog(false)}>{t("cancel")}</Button>
            <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
            </GoldButton>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>);

}


function RenterCardActions({ renter, services, onDelete }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}?link_renter=${renter.id}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get renter stats
  const thisMonthServices = services.filter(s => s.renter_id === renter.id && s.service_date?.startsWith(new Date().toISOString().slice(0, 7)));
  const thisMonthRevenue = thisMonthServices.reduce((s, e) => s + (e.amount || 0), 0);
  const thisWeekServices = services.filter(s => {
    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay());
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    return s.renter_id === renter.id && s.service_date >= ws.toISOString().slice(0, 10) && s.service_date < we.toISOString().slice(0, 10);
  }).length;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        title="Copy invite link"
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Copy invite link"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => onDelete(renter.id)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Delete stylist"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ChargesSection({ charges, renters, renterMap, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", renter_id: "", amount: "", frequency: "monthly" });
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    await base44.entities.Charge.create({ ...form, amount: parseFloat(form.amount) || 0 });
    setForm({ description: "", renter_id: "", amount: "", frequency: "monthly" });
    setShowAdd(false);toast({ title: t("add") });onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-serif text-base font-medium">{t("chargesLedger") || "Charges Ledger"}</h2>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="w-3.5 h-3.5 mr-1" />{t("addCharge") || "Add Charge"}
        </Button>
      </div>
      {showAdd &&
      <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap gap-2 items-end">
          <Input placeholder="Description *" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="flex-1 min-w-[140px] min-h-[44px]" />
          <Select value={form.renter_id} onValueChange={(v) => setForm((f) => ({ ...f, renter_id: v }))}>
            <SelectTrigger className="w-36 min-h-[44px]"><SelectValue placeholder="Stylist" /></SelectTrigger>
            <SelectContent>{renters.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="$" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-24 font-mono min-h-[44px]" />
          <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
            <SelectTrigger className="w-28 min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("weekly")}</SelectItem>
              <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
              <SelectItem value="monthly">{t("monthly")}</SelectItem>
            </SelectContent>
          </Select>
          <GoldButton onClick={handleAdd}>{t("add")}</GoldButton>
        </div>
      }
      {charges.length === 0 ?
      <p className="text-sm text-muted-foreground text-center py-8">{t("noCharges") || "No recurring charges yet."}</p> :

      <div className="divide-y divide-border">
          {charges.map((c) =>
        <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 min-h-[44px]">
              <div>
                <p className="text-sm font-medium">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.renter_id ? renterMap[c.renter_id]?.name || "—" : "All"} · {freqLabel(c.frequency)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{formatCurrency(c.amount)}</span>
                <button onClick={() => base44.entities.Charge.delete(c.id).then(onRefresh)} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}