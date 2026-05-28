import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getInitials, getAvatarColor, freqLabel, calcMonthlyRent, cn } from "@/lib/utils";
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
  frequency: "weekly", due_day: "Saturday", commission_owner: 40, base_salary: "", base_salary_frequency: "weekly",
  status: "active", phone: "", start_date: "", end_date: "", notes: "", user_email: ""
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
          <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder={t("rolePlaceholder")} className="min-h-[44px]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("phone")}</label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("phonePlaceholder")} className="min-h-[44px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Start Date</label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="min-h-[44px]" />
        </div>
      </div>
      {form.payment_model === "rent" && (
        <div className="space-y-3">
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
          {form.frequency !== "monthly" && (
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Due Day</label>
              <Select value={form.due_day || "Saturday"} onValueChange={(v) => setForm((f) => ({ ...f, due_day: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      
      {form.payment_model === "commission" &&
      <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("ownerCommissionPct")}</label>
            <Input type="number" value={form.commission_owner} onChange={(e) => setForm((f) => ({ ...f, commission_owner: e.target.value }))} className="font-mono min-h-[44px]" min="0" max="100" />
            <SplitBar ownerPct={ownerPct} showLabels className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{t("stylistKeeps")} {100 - ownerPct}%</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border">
            <p className="text-xs font-semibold text-foreground">Base Salary <span className="text-muted-foreground font-normal">(optional)</span></p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount ($)</label>
                <Input type="number" value={form.base_salary} onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Paid</label>
                <Select value={form.base_salary_frequency} onValueChange={(v) => setForm((f) => ({ ...f, base_salary_frequency: v }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">{t("weekly")}</SelectItem>
                    <SelectItem value="monthly">{t("monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      }
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("status")}</label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v, end_date: v === "active" ? "" : f.end_date }))}>
          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("active")}</SelectItem>
            <SelectItem value="inactive">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.status === "inactive" && (
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">End Date / Last Day Worked *</label>
          <Input type="date" value={form.end_date || ""} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="min-h-[44px]" required />
        </div>
      )}
      <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder={`${t("notes")} (${t("optional")})`} className="min-h-[44px]" />
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
  const openEdit = (r) => {setForm({ ...emptyForm, ...r, rent_amount: r.rent_amount || "", commission_owner: r.commission_owner ?? 40, base_salary: r.base_salary || "", base_salary_frequency: r.base_salary_frequency || "weekly", due_day: r.due_day || "Saturday", end_date: r.end_date || "" });setEditRenter(r);setShowDialog(true);};

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        rent_amount: form.payment_model === "rent" ? parseFloat(form.rent_amount) || 0 : 0,
        commission_owner: form.payment_model === "commission" ? parseFloat(form.commission_owner) || 40 : 0,
        base_salary: form.payment_model === "commission" ? parseFloat(form.base_salary) || 0 : 0,
        base_salary_frequency: form.base_salary_frequency || "weekly",
      };
      if (editRenter) {
        await base44.entities.Renter.update(editRenter.id, data);
        toast({ title: t("stylistUpdated") });
      } else {
        await base44.entities.Renter.create(data);
        toast({ title: t("stylistAdded") });
      }
      setShowDialog(false);
      loadData();
    } catch (err) {
      toast({ title: t("saveFailed"), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("deleteStylistConfirm"))) return;
    try {
      await base44.entities.Renter.delete(id);
      toast({ title: t("stylistDeleted") });
      loadData();
    } catch (err) {
      toast({ title: t("deleteFailed"), description: err.message, variant: 'destructive' });
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
              <p className="font-semibold text-foreground">{t("gettingStarted")}</p>
              <p>{t("gettingStartedDesc")}</p>
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
              <TabsTrigger value="users" className="min-h-[44px] rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary whitespace-nowrap">{t("userMgmt")}</TabsTrigger>
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
                    placeholder={t("searchByNameOrRole")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 min-h-[44px]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "rent", "commission"].map(f => (
                    <button
                      key={f}
                      onClick={() => setModelFilter(f)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors min-h-[44px]", modelFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}
                    >
                      {f === "all" ? t("allModels") : t(f)}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowInactive(!showInactive)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]", showInactive ? "bg-muted/60 text-foreground" : "bg-muted text-muted-foreground")}
                  >
                    {showInactive ? `✓ ${t("showInactive")}` : t("hideInactive")}
                  </button>
                </div>
              </div>

              {/* Renter Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p className="text-sm">{t("noStylistsMatch")}</p>
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
                          {r.start_date && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("since")} {new Date(r.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>}
                          {r.end_date && r.status === "inactive" && <p className="text-[10px] text-destructive/70 mt-0.5">Ended {new Date(r.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
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
                        {r.due_day && r.frequency !== "monthly" && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Due every</span>
                            <span className="font-medium">{r.due_day}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">≈ {t("monthly")}</span>
                          <span className="font-mono text-muted-foreground">{formatCurrency(calcMonthlyRent(r, new Date().toISOString().slice(0, 7)))}</span>
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
                    {r.payment_model === "commission" && (r.base_salary || 0) > 0 &&
                    <div className="text-xs border-t border-border pt-2 mt-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Salary</span>
                          <span className="font-mono font-semibold">{formatCurrency(r.base_salary)}/{r.base_salary_frequency === "monthly" ? "mo" : "wk"}</span>
                        </div>
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
                  <span className="text-sm font-medium">{t("addStylist")}</span>
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
          <DialogHeader><DialogTitle>{editRenter ? t("editStylist") : t("addStylist")}</DialogTitle></DialogHeader>
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
  const { t } = useLanguage();
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
  // Use proper Mon-Sun week bounds consistent with the rest of the app
  const thisWeekServices = services.filter(s => {
    const ws = new Date();
    const day = ws.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    ws.setDate(ws.getDate() + diff);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const wsStr = ws.toISOString().slice(0, 10);
    const weStr = we.toISOString().slice(0, 10);
    return s.renter_id === renter.id && s.service_date >= wsStr && s.service_date <= weStr;
  }).length;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        title={t("copyInviteLink")}
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={t("copyInviteLink")}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => onDelete(renter.id)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={t("deleteStylist")}
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
    setShowAdd(false); toast({ title: t("chargeAdded") }); onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-serif text-base font-medium">{t("chargesLedger")}</h2>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="w-3.5 h-3.5 mr-1" />{t("addCharge")}
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
      <p className="text-sm text-muted-foreground text-center py-8">{t("noCharges")}</p> :

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