import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, categoryBadge, computeEarnings, PAYMENT_METHOD_LABELS, cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const DATE_FILTER_KEYS = [
  { key: "thisWeek", value: "week" },
  { key: "thisMonth", value: "month" },
  { key: "lastMonth", value: "lastmonth" },
  { key: "allTime", value: "all" },
];

function getDateRange(filter) {
  const now = new Date();
  if (filter === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const ws = new Date(now); ws.setDate(now.getDate() + diff); ws.setHours(0, 0, 0, 0);
    const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
    return [ws.toISOString().split("T")[0], we.toISOString().split("T")[0]];
  }
  if (filter === "month") {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    return [start, end];
  }
  if (filter === "lastmonth") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    return [start, end];
  }
  return [null, null];
}

const emptyForm = { renter_id: "", client_name: "", description: "", amount: "", tip_amount: "", service_date: new Date().toISOString().split("T")[0], category: "hair", payment_method: "cash" };

export default function ServiceTracker() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [myRenter, setMyRenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterRenter, setFilterRenter] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterDate, setFilterDate] = useState("month");
  const [editService, setEditService] = useState(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    const [r, s] = await Promise.all([base44.entities.Renter.list(), base44.entities.ServiceEntry.list("-service_date", 300)]);
    setRenters(r);
    if (!isAdmin && user?.email) {
      const me = r.find(x => x.user_email === user.email);
      setMyRenter(me || null);
      setServices(me ? s.filter(x => x.renter_id === me.id) : []);
    } else {
      setServices(s);
    }
    setLoading(false);
  }, [isAdmin, user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const openEdit = (s) => {
    setEditService(s);
    setForm({ renter_id: s.renter_id, client_name: s.client_name || "", description: s.description || "", amount: String(s.amount || ""), tip_amount: String(s.tip_amount || ""), service_date: s.service_date || new Date().toISOString().split("T")[0], category: s.category || "hair", payment_method: s.payment_method || "cash" });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.service_date) return;
    setSaving(true);
    const renterId = isAdmin ? form.renter_id : myRenter?.id;
    if (!renterId) { setSaving(false); return; }
    const renter = renterMap[renterId];
    const amt = parseFloat(form.amount) || 0;
    const tip = parseFloat(form.tip_amount) || 0;
    const earnings = computeEarnings(amt, renter);
    if (editService) {
      await base44.entities.ServiceEntry.update(editService.id, { ...form, renter_id: renterId, amount: amt, tip_amount: tip, ...earnings });
      toast({ title: t("edit") });
    } else {
      await base44.entities.ServiceEntry.create({ ...form, renter_id: renterId, amount: amt, tip_amount: tip, ...earnings });
      toast({ title: t("logService") });
    }
    setShowAdd(false); setEditService(null); setForm(emptyForm); setSaving(false);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const [dateFrom, dateTo] = getDateRange(filterDate);
  const filtered = services
    .filter(s => filterRenter === "all" || s.renter_id === filterRenter)
    .filter(s => filterCat === "all" || s.category === filterCat)
    .filter(s => filterMethod === "all" || s.payment_method === filterMethod)
    .filter(s => {
      if (!dateFrom) return true;
      return s.service_date >= dateFrom && s.service_date <= dateTo;
    });

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const totalStylist = filtered.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const totalOwner = filtered.reduce((s, e) => s + (e.owner_earnings || 0), 0);
  const totalTips = filtered.reduce((s, e) => s + (e.tip_amount || 0), 0);

  const selectedRenter = isAdmin ? renterMap[form.renter_id] : myRenter;
  const previewAmt = parseFloat(form.amount) || 0;
  const previewTip = parseFloat(form.tip_amount) || 0;
  const previewEarnings = selectedRenter && previewAmt > 0 ? computeEarnings(previewAmt, selectedRenter) : null;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("services")}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("serviceTracker")}</h1>
          </div>
          <GoldButton onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />{t("logService")}</GoldButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t("totalRevenue")} value={formatCurrency(totalAmount)} accent glow />
          <KpiCard label={t("stylistsEarnings")} value={formatCurrency(totalStylist)} />
          <KpiCard label={t("ourCommission")} value={formatCurrency(totalOwner)} />
          <KpiCard label={t("tips")} value={formatCurrency(totalTips)} />
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-3">
          {/* Date filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {DATE_FILTER_KEYS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterDate(f.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 border",
                  filterDate === f.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                )}
              >
                {t(f.key)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Dropdown filters */}
          <div className={cn("grid gap-2", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
            {isAdmin && (
              <Select value={filterRenter} onValueChange={setFilterRenter}>
                <SelectTrigger className="h-8 text-xs bg-muted/40 border-border rounded-lg">
                  <SelectValue placeholder="All Stylists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStylists") || "All Stylists"}</SelectItem>
                  {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-8 text-xs bg-muted/40 border-border rounded-lg">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories") || "All Categories"}</SelectItem>
                <SelectItem value="hair">{t("hair")}</SelectItem>
                <SelectItem value="nails">{t("nails")}</SelectItem>
                <SelectItem value="aesthetics">{t("aesthetics")}</SelectItem>
                <SelectItem value="other">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="h-8 text-xs bg-muted/40 border-border rounded-lg">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allMethods") || "All Methods"}</SelectItem>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Services list */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">No services found for this filter.</p>
              <button onClick={() => setShowAdd(true)} className="text-xs text-primary hover:underline">Log your first service →</button>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(s => {
                  const cat = categoryBadge(s.category);
                  const r = renterMap[s.renter_id];
                  const isComm = r?.payment_model === "commission";
                  const dateStr = s.service_date ? new Date(s.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
                  return (
                    <div key={s.id} className="px-4 py-3.5 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                          {isAdmin && r?.name && <span className="text-xs font-medium text-foreground truncate">{r.name}</span>}
                        </div>
                        <p className="text-sm font-medium leading-snug">{s.description || (s.client_name ? s.client_name : "—")}</p>
                        {s.description && s.client_name && <p className="text-xs text-muted-foreground">{s.client_name}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{dateStr}</span>
                          <span>·</span>
                          <span>{PAYMENT_METHOD_LABELS[s.payment_method] || "—"}</span>
                          {isComm && <><span>·</span><span>{r.commission_owner || 40}% ours</span></>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono font-semibold text-sm">{formatCurrency(s.amount)}</span>
                        {(s.tip_amount || 0) > 0 && (
                          <span className="font-mono text-xs text-muted-foreground">+{formatCurrency(s.tip_amount)} tip</span>
                        )}
                        <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center mt-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => base44.entities.ServiceEntry.delete(s.id).then(() => { toast({ title: "Deleted" }); loadData(); })}
                          className="text-muted-foreground hover:text-destructive min-h-[36px] min-w-[36px] flex items-center justify-center mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Mobile totals */}
                <div className="bg-muted/30 px-4 py-3 flex justify-between items-center border-t border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("totals")}</span>
                  <div className="text-right space-y-0.5">
                    <p className="font-mono font-semibold text-sm">{formatCurrency(totalAmount)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{t("tips")}: {formatCurrency(totalTips)}</p>
                  </div>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("date")}</th>
                      {isAdmin && <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("stylists")}</th>}
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("clientName")}</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("category")}</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("paymentMethod")}</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("amount")}</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("tips")}</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("commission")}</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(s => {
                      const cat = categoryBadge(s.category);
                      const r = renterMap[s.renter_id];
                      const isComm = r?.payment_model === "commission";
                      return (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {s.service_date ? new Date(s.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                          </td>
                          {isAdmin && <td className="px-4 py-3 font-medium whitespace-nowrap">{r?.name || "—"}</td>}
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.description || "—"}</p>
                            {s.client_name && <p className="text-xs text-muted-foreground">{s.client_name}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap", cat.className)}>{cat.label}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{PAYMENT_METHOD_LABELS[s.payment_method] || "—"}</td>
                          <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{formatCurrency(s.amount)}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs whitespace-nowrap">
                            {(s.tip_amount || 0) > 0 ? `+${formatCurrency(s.tip_amount)}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {isComm ? (
                              <div className="flex items-center gap-2 w-24">
                                <SplitBar ownerPct={r.commission_owner || 40} />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{r.commission_owner || 40}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-primary/30 text-primary bg-primary/5">Rent</span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                           <div className="flex items-center">
                             <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
                               <Pencil className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => base44.entities.ServiceEntry.delete(s.id).then(() => { toast({ title: "Deleted" }); loadData(); })} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border font-semibold">
                      <td colSpan={isAdmin ? 5 : 4} className="px-5 py-3 text-sm">{t("totals") || "Totals"}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{formatCurrency(totalTips)}</td>
                      <td colSpan={2} className="px-4 py-3 text-xs text-muted-foreground">
                        Stylists: {formatCurrency(totalStylist)} · Ours: {formatCurrency(totalOwner)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Log Service Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setEditService(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editService ? t("edit") : t("logService")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {isAdmin && (
              <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select Stylist *" /></SelectTrigger>
                <SelectContent>{renters.filter(r => r.status === "active").map(r => <SelectItem key={r.id} value={r.id}>{r.name} · {r.role}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">{t("hair")}</SelectItem>
                  <SelectItem value="nails">{t("nails")}</SelectItem>
                  <SelectItem value="aesthetics">{t("aesthetics")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Client Name (optional)" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="min-h-[44px]" />
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[44px]" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" />
              <Input type="number" placeholder="Tip ($)" value={form.tip_amount} onChange={e => setForm(f => ({ ...f, tip_amount: e.target.value }))} className="font-mono min-h-[44px]" min="0" step="0.01" />
            </div>
            <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} className="min-h-[44px]" />

            {/* Preview */}
            {previewEarnings && selectedRenter && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-2 border border-border">
                {selectedRenter.payment_model === "commission" ? (
                  <>
                    <SplitBar ownerPct={selectedRenter.commission_owner || 40} height="h-2" showLabels />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Owner gets</span>
                      <span className="font-mono font-semibold text-primary">{formatCurrency(previewEarnings.owner_earnings)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stylist gets</span>
                      <span className="font-mono font-semibold">{formatCurrency(previewEarnings.renter_earnings)}{previewTip > 0 ? ` + ${formatCurrency(previewTip)} tip` : ""}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Full amount → stylist (rent model){previewTip > 0 ? ` + ${formatCurrency(previewTip)} tip` : ""}</p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowAdd(false)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.amount || (isAdmin && !form.renter_id)}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}