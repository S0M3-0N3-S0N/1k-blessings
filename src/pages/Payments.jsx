import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, freqLabel, PAYMENT_METHOD_LABELS, cn, getWeekStart, getWeekEnd, formatDateRange, getInitials, getAvatarColor, isPaymentOverdue } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Scissors, Plus, Trash2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

export default function Payments() {
  const [renters, setRenters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [monthOffset, setMonthOffset] = useState(0);
  const [markDialog, setMarkDialog] = useState(null); // { renter, existing }
  const [markForm, setMarkForm] = useState({ amount: "", payment_method: "cash", notes: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [services, setServices] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const [charges, setCharges] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, p, s, c] = await Promise.all([base44.entities.Renter.list(), base44.entities.Payment.list("-period"), base44.entities.ServiceEntry.list("-service_date", 300), base44.entities.Charge.list()]);
      setRenters(r); setPayments(p); setServices(s); setCharges(c); setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load data. Pull down to retry.');
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const monthStr = `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = displayDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rentRenters = renters.filter(r => r.payment_model === "rent" && r.status === "active");

  const getRenterStatus = (renter) => {
    const existing = payments.find(p => p.renter_id === renter.id && p.period?.startsWith(monthStr));
    if (existing?.status === "paid") return { status: "paid", payment: existing };
    const isOverdue = isPaymentOverdue(existing, renter);
    return { status: isOverdue ? "overdue" : "pending", payment: existing };
  };

  const openMarkPaid = (renter) => {
    const { payment } = getRenterStatus(renter);
    setMarkForm({ amount: renter.rent_amount || "", payment_method: "cash", notes: "" });
    setMarkDialog({ renter, existing: payment });
  };

  const confirmMarkPaid = async () => {
    setSaving(true);
    try {
      const { renter, existing } = markDialog;
      const amount = parseFloat(markForm.amount) || renter.rent_amount;
      if (amount <= 0) {
        toast({ title: 'Invalid amount', description: 'Amount must be greater than 0', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const data = { status: "paid", paid_date: new Date().toISOString(), amount, payment_method: markForm.payment_method, notes: markForm.notes };
      if (existing) {
        await base44.entities.Payment.update(existing.id, data);
      } else {
        await base44.entities.Payment.create({ renter_id: renter.id, period: monthStr, ...data });
      }
      setMarkDialog(null);
      toast({ title: `${renter.name} ${t("markPaid")}` });
      loadData();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const markPending = async (renter) => {
    try {
      const { payment } = getRenterStatus(renter);
      if (payment) await base44.entities.Payment.update(payment.id, { status: "pending", paid_date: null });
      toast({ title: t("pending") });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <p className="text-sm text-destructive text-center">{error}</p>
      <button onClick={loadData} className="text-xs text-primary underline">Try again</button>
    </div>
  );

  const rows = rentRenters.map(r => ({ ...r, ...getRenterStatus(r) }));
  const filteredRows = filter === "all" ? rows : rows.filter(r => r.status === filter);

  const paidCount = rows.filter(r => r.status === "paid").length;
  const pendingCount = rows.filter(r => r.status === "pending").length;
  const overdueCount = rows.filter(r => r.status === "overdue").length;
  const collectedAmt = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.payment?.amount || r.rent_amount || 0), 0);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Finance</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{monthLabel}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("rent")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-2 rounded-lg border border-border hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-muted-foreground">{monthLabel}</span>
            <button onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label={t("collected")} value={formatCurrency(collectedAmt)} accent glow />
          <KpiCard label={t("paid")} value={paidCount} />
          <KpiCard label={t("pending")} value={pendingCount} />
          <KpiCard label={t("overdue")} value={overdueCount} />
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", "paid", "pending", "overdue"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors min-h-[44px]", filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f === "all" ? (t("all") || "All") : t(f)}
            </button>
          ))}
        </div>

        {/* Rent Stylists */}
        {rentRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rent Stylists</p>
            </div>
            {filteredRows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No payments match this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRows.map(r => (
                  <div key={r.id} className={cn("flex items-center justify-between px-5 py-4 hover:bg-muted/20 gap-3 flex-wrap", r.status === "overdue" && "border-l-[3px] border-l-red-500")}>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.role} · {freqLabel(r.frequency)}</p>
                      {r.payment?.payment_method && r.status === "paid" && (
                        <p className="text-xs text-muted-foreground mt-0.5">Paid via {PAYMENT_METHOD_LABELS[r.payment.payment_method]} · {r.payment.paid_date ? new Date(r.payment.paid_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <span className="font-mono text-sm font-semibold">{formatCurrency(r.rent_amount)}<span className="text-muted-foreground text-xs font-normal">/{freqLabel(r.frequency)}</span></span>
                      <StatusBadge status={r.status} />
                      {r.status !== "paid" ? (
                        <GoldButton size="sm" onClick={() => openMarkPaid(r)}>
                          <CheckCircle2 className="w-3.5 h-3.5" />{t("markPaid")}
                        </GoldButton>
                      ) : (
                        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => markPending(r)}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />{t("undo") || "Undo"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commission Stylists - Combined View */}
        <CommissionSection renters={renters} services={services} monthStr={monthStr} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />

        {/* Payment History (last 3 months) */}
        <PaymentHistory renters={rentRenters} allPayments={payments} currentMonth={monthStr} />

        {/* Charges Ledger */}
        <ChargesLedger charges={charges} renters={renters} onRefresh={loadData} />


      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={!!markDialog} onOpenChange={() => setMarkDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("markPaid")} — {markDialog?.renter?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("amount")}</label>
              <Input type="number" value={markForm.amount} onChange={e => setMarkForm(f => ({ ...f, amount: e.target.value }))} className="font-mono min-h-[44px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("paymentMethod")}</label>
              <Select value={markForm.payment_method} onValueChange={v => setMarkForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Note (optional)" value={markForm.notes} onChange={e => setMarkForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[44px]" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setMarkDialog(null)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={confirmMarkPaid} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("markPaid")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}

function CommissionSection({ renters, services, monthStr, weekOffset, setWeekOffset }) {
  const { t } = useLanguage();
  const [view, setView] = useState("monthly");
  const commissionRenters = renters.filter(r => r.payment_model === "commission" && r.status === "active");
  if (commissionRenters.length === 0) return null;

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const monthServices = services.filter(s => s.service_date?.startsWith(monthStr));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-2 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5"><Scissors className="w-3 h-3" />{t("commissionSplits")}</p>
          <p className="font-serif text-base font-medium mt-0.5">Commission Stylists</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {["monthly", "weekly"].map(v => (
              <button key={v} onClick={() => setView(v)} className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize", view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {v}
              </button>
            ))}
          </div>
          {view === "weekly" && (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-muted-foreground min-w-[120px] text-center">{formatDateRange(ws)}</span>
              <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {view === "monthly" ? (
        <div className="divide-y divide-border">
          {commissionRenters.map(r => {
            const rs = monthServices.filter(s => s.renter_id === r.id);
            const gross = rs.reduce((s, e) => s + (e.amount || 0), 0);
            const ownerCut = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
            const stylistCut = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
            return (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.role} · {rs.length} services · {r.commission_owner || 40}% / {100 - (r.commission_owner || 40)}% split</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end text-xs">
                  <div className="text-right"><p className="text-muted-foreground">Revenue</p><p className="font-mono font-semibold">{formatCurrency(gross)}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">Stylist</p><p className="font-mono">{formatCurrency(stylistCut)}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">Owner</p><p className="font-mono text-primary font-semibold">{formatCurrency(ownerCut)}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {[t("stylists"), t("services"), t("totalRevenue"), t("stylistsEarnings"), `${t("ourCommission")} ✦`, "Split"].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === t("stylists") ? "text-left pl-5" : "text-right last:text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {commissionRenters.map((r, i) => {
                const rs = weekServices.filter(s => s.renter_id === r.id);
                const gross = rs.reduce((s, e) => s + (e.amount || 0), 0);
                const ownerCut = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
                const stylistCut = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
                const av = getAvatarColor(i);
                return (
                  <tr key={r.id} className={cn("hover:bg-muted/20", gross === 0 && "opacity-50")}>
                    <td className="pl-5 pr-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>{getInitials(r.name)}</div>
                        <div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.role}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{rs.length}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(gross)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground"><span className="text-xs mr-1">{100 - (r.commission_owner || 40)}%</span>{formatCurrency(stylistCut)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-primary font-semibold"><span className="text-xs mr-1">{r.commission_owner || 40}%</span>{formatCurrency(ownerCut)}</td>
                    <td className="px-4 py-3 w-28"><SplitBar ownerPct={r.commission_owner || 40} /></td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 border-t border-border font-semibold">
                <td className="pl-5 pr-4 py-3 text-sm">{t("totals")}</td>
                <td className="px-4 py-3 text-right">{commissionRenters.reduce((s, r) => s + weekServices.filter(x => x.renter_id === r.id).length, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRenters.reduce((s, r) => s + weekServices.filter(x => x.renter_id === r.id).reduce((a, e) => a + (e.amount || 0), 0), 0))}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRenters.reduce((s, r) => s + weekServices.filter(x => x.renter_id === r.id).reduce((a, e) => a + (e.renter_earnings || 0), 0), 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(commissionRenters.reduce((s, r) => s + weekServices.filter(x => x.renter_id === r.id).reduce((a, e) => a + (e.owner_earnings || 0), 0), 0))}</td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



function ChargesLedger({ charges, renters, onRefresh }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", renter_id: "", amount: "", frequency: "monthly" });
  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    await base44.entities.Charge.create({ ...form, amount: parseFloat(form.amount) || 0 });
    setForm({ description: "", renter_id: "", amount: "", frequency: "monthly" });
    setShowAdd(false); toast({ title: "Charge added" }); onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("chargesLedger") || "Charges Ledger"}</p>
          <p className="font-serif text-base font-medium mt-0.5">Recurring Charges</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowAdd(s => !s)}>
          <Plus className="w-3.5 h-3.5 mr-1" />{t("addCharge") || "Add"}
        </Button>
      </div>
      {showAdd && (
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap gap-2 items-end">
          <Input placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="flex-1 min-w-[140px] min-h-[44px]" />
          <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
            <SelectTrigger className="w-36 min-h-[44px]"><SelectValue placeholder="Stylist" /></SelectTrigger>
            <SelectContent>{renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="$" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-24 font-mono min-h-[44px]" />
          <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
            <SelectTrigger className="w-28 min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("weekly")}</SelectItem>
              <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
              <SelectItem value="monthly">{t("monthly")}</SelectItem>
            </SelectContent>
          </Select>
          <GoldButton onClick={handleAdd}>{t("add")}</GoldButton>
        </div>
      )}
      {charges.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No recurring charges yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {charges.map(c => (
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
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentHistory({ renters, allPayments, currentMonth }) {
  const { t } = useLanguage();
  const now = new Date();
  const prevMonths = [1, 2, 3].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const hasHistory = renters.some(r => allPayments.some(p => p.renter_id === r.id && prevMonths.some(m => p.period?.startsWith(m))));
  if (!hasHistory) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("paymentHistory") || "Payment History"}</p>
        <p className="font-serif text-base font-medium mt-0.5">{t("last3Months") || "Last 3 Months"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("stylists")}</th>
              {prevMonths.map(m => {
                const [yr, mo] = m.split("-").map(Number);
                return <th key={m} className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</th>;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {renters.map(r => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-5 py-3 font-medium">{r.name}</td>
                {prevMonths.map(m => {
                  const p = allPayments.find(x => x.renter_id === r.id && x.period?.startsWith(m));
                  const s = p?.status || "pending";
                  return (
                    <td key={m} className="px-4 py-3 text-center">
                      <StatusBadge status={s} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}