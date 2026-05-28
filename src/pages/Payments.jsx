import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, freqLabel, PAYMENT_METHOD_LABELS, cn, getWeekStart, getWeekEnd, formatDateRange, getInitials, getAvatarColor, isPaymentOverdue, getDueDate, isBeforeStartDate, isAfterEndDate, calcMonthlyRent } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Scissors, Plus, Trash2, AlertCircle } from "lucide-react";
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
  const [markForm, setMarkForm] = useState({ amount: "", payment_method: "cash", notes: "", paid_time: "", pay_type: "full" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [services, setServices] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [charges, setCharges] = useState([]);
  const [commPayouts, setCommPayouts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, p, s, c, cp] = await Promise.all([
        base44.entities.Renter.list(),
        base44.entities.Payment.list("-period"),
        base44.entities.ServiceEntry.list("-service_date", 300),
        base44.entities.Charge.list(),
        base44.entities.CommissionPayout.list("-period"),
      ]);
      setRenters(r); setPayments(p); setServices(s); setCharges(c); setCommPayouts(cp); setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError("Failed to load data. Pull down to retry.");
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const monthStr = `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = displayDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Only show rent renters who were active during this month (not before start, not after end)
  const rentRenters = renters.filter(r =>
    r.payment_model === "rent" &&
    (r.status === "active" || (r.status === "inactive" && !isAfterEndDate(monthStr, r))) &&
    !isBeforeStartDate(monthStr, r)
  );

  const getRenterStatus = (renter) => {
    // Only exact month-period payments count as full-month paid (not weekly sub-payments)
    const existing = payments.find(p => p.renter_id === renter.id && p.period === monthStr);
    if (existing?.status === "paid") return { status: "paid", payment: existing };
    const isOverdue = isPaymentOverdue(existing, renter);
    return { status: isOverdue ? "overdue" : "pending", payment: existing };
  };

  const getWeeklyRentAmount = (renter) => {
    // For weekly renters, one week's rent. For biweekly, half. For monthly, divide by ~4.33
    if (renter.frequency === "weekly") return renter.rent_amount || 0;
    if (renter.frequency === "biweekly") return renter.rent_amount || 0;
    return parseFloat(((renter.rent_amount || 0) / (52 / 12)).toFixed(2));
  };

  const openMarkPaid = (renter) => {
    const { payment } = getRenterStatus(renter);
    const nowNY = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" });
    setMarkForm({ amount: calcMonthlyRent(renter, monthStr) || "", payment_method: "cash", notes: "", paid_time: nowNY, pay_type: "full" });
    setMarkDialog({ renter, existing: payment });
  };

  const confirmMarkPaid = async () => {
    setSaving(true);
    try {
      const { renter, existing } = markDialog;
      const amount = parseFloat(markForm.amount) || renter.rent_amount;
      if (amount <= 0) {
        toast({ title: t("invalidAmount"), description: t("amountMustBePositive"), variant: 'destructive' });
        setSaving(false);
        return;
      }
      const todayNY = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      const paidDateTime = markForm.paid_time
        ? new Date(`${todayNY}T${markForm.paid_time}:00`).toISOString()
        : new Date().toISOString();

      if (markForm.pay_type === "weekly") {
        // Create a separate payment record for this specific week only — does NOT mark full month as paid
              const weekStartDate = getWeekStart(new Date(), 0).toISOString().split("T")[0];
        const weekPeriodKey = `${monthStr}-week-${weekStartDate}`;
        // Check if there's already a payment for this exact week
        const existingWeekPayment = payments.find(p => p.renter_id === renter.id && p.period === weekPeriodKey);
        const weekLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
        const weekData = {
          status: "paid",
          paid_date: paidDateTime,
          due_date: getDueDate(weekStartDate, "weekly"),
          amount,
          payment_method: markForm.payment_method,
          notes: markForm.notes || `Weekly payment — week of ${weekLabel}`,
        };
        if (existingWeekPayment) {
          await base44.entities.Payment.update(existingWeekPayment.id, weekData);
        } else {
          await base44.entities.Payment.create({ renter_id: renter.id, period: weekPeriodKey, ...weekData });
        }
        setMarkDialog(null);
        toast({ title: `${renter.name} — Weekly payment recorded` });
      } else {
        const data = {
          status: "paid",
          paid_date: paidDateTime,
          due_date: getDueDate(monthStr, renter.frequency),
          amount,
          payment_method: markForm.payment_method,
          notes: markForm.notes,
        };
        if (existing) {
          await base44.entities.Payment.update(existing.id, data);
        } else {
          await base44.entities.Payment.create({ renter_id: renter.id, period: monthStr, ...data });
        }
        setMarkDialog(null);
        toast({ title: `${renter.name} — ${t("markPaid")}` });
        window.dispatchEvent(new CustomEvent('overdueCountChanged'));
      }
      loadData();
    } catch (err) {
      console.error('Mark paid error:', err);
      toast({ title: t("saveFailed"), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const markPending = async (renter) => {
    try {
      const { payment } = getRenterStatus(renter);
      if (payment) {
        await base44.entities.Payment.update(payment.id, { status: "pending", paid_date: null });
        toast({ title: t("pending") });
        window.dispatchEvent(new CustomEvent('overdueCountChanged'));
        loadData();
      }
    } catch (err) {
      console.error('Mark pending error:', err);
      toast({ title: t("saveFailed"), description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-destructive text-center">{error}</p>
      <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">{t("retry")}</button>
    </div>
  );

  const rows = rentRenters.map(r => ({ ...r, ...getRenterStatus(r) }));
  const filteredRows = filter === "all" ? rows : rows.filter(r => r.status === filter);

  const paidCount = rows.filter(r => r.status === "paid").length;
  const pendingCount = rows.filter(r => r.status === "pending").length;
  const overdueCount = rows.filter(r => r.status === "overdue").length;
  const collectedAmt = rows.filter(r => r.status === "paid").reduce((s, r) => s + calcMonthlyRent(r, monthStr), 0);
  const totalOwed = rows.filter(r => r.status !== "paid").reduce((s, r) => s + calcMonthlyRent(r, monthStr), 0);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("finance")}</p>
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
          <KpiCard label="Total Owed" value={formatCurrency(totalOwed)} className={totalOwed > 0 ? "border-amber-500/30" : ""} />
          <KpiCard label={t("overdue")} value={overdueCount} />
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", "paid", "pending", "overdue"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors min-h-[44px]", filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f === "all" ? t("all") : t(f)}
            </button>
          ))}
        </div>

        {/* Rent Stylists */}
        {rentRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rentStylists")}</p>
            </div>
            {filteredRows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">{t("noPaymentsMatch")}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRows.map(r => (
                  <div key={r.id} className={cn("flex items-center justify-between px-5 py-4 hover:bg-muted/20 gap-3 flex-wrap", r.status === "overdue" && "border-l-[3px] border-l-red-500")}>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.role} · {freqLabel(r.frequency)}</p>
                      {r.payment?.payment_method && r.status === "paid" && (
                        <p className="text-xs text-emerald-500 mt-0.5 font-medium">
                          ✓ {t("paid")} via {PAYMENT_METHOD_LABELS[r.payment.payment_method]}
                          {r.payment.paid_date ? ` · ${new Date(r.payment.paid_date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })} at ${new Date(r.payment.paid_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" })}` : ""}
                        </p>
                      )}
                      {r.payment?.payment_method && r.status === "pending" && r.payment.notes?.includes("Renter initiated") && (
                        <p className="text-xs text-amber-500 mt-0.5 font-medium">
                          ⏳ Sent via {PAYMENT_METHOD_LABELS[r.payment.payment_method]} — awaiting confirmation
                        </p>
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
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />{t("undo")}
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
        <CommissionSection renters={renters} services={services} monthStr={monthStr} weekOffset={weekOffset} setWeekOffset={setWeekOffset} commPayouts={commPayouts} onRefresh={loadData} />

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
            {/* Weekly vs Full Month toggle */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Payment Type</label>
              <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
                {[
                  { v: "full", label: "Full Month" },
                  { v: "weekly", label: "This Week Only" },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => {
                      const renter = markDialog?.renter;
                      const amt = v === "weekly" ? getWeeklyRentAmount(renter) : calcMonthlyRent(renter, monthStr);
                      setMarkForm(f => ({ ...f, pay_type: v, amount: amt || "" }));
                    }}
                    className={cn("flex-1 py-2 rounded-md text-xs font-semibold transition-all", markForm.pay_type === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {markForm.pay_type === "weekly" && (
                <p className="text-[11px] text-amber-500 mt-1">⚠ This marks a partial weekly payment — the month will remain unpaid overall.</p>
              )}
            </div>
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
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Time Paid (NY Time)</label>
              <Input type="time" value={markForm.paid_time} onChange={e => setMarkForm(f => ({ ...f, paid_time: e.target.value }))} className="min-h-[44px] font-mono" />
            </div>
            <Input placeholder={`${t("notes")} (${t("optional")})`} value={markForm.notes} onChange={e => setMarkForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[44px]" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setMarkDialog(null)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={confirmMarkPaid} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : markForm.pay_type === "weekly" ? "Mark Week Paid" : t("markPaid")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}

function CommissionSection({ renters, services, monthStr, weekOffset, setWeekOffset, commPayouts, onRefresh }) {
  const { t } = useLanguage();
  const [view, setView] = useState("monthly");
  // Commission renters active during this month (not inactive after their end date, not before start)
  const commissionRenters = renters.filter(r =>
    r.payment_model === "commission" &&
    (r.status === "active" || (r.status === "inactive" && !isAfterEndDate(monthStr, r))) &&
    !isBeforeStartDate(monthStr, r)
  );
  if (commissionRenters.length === 0) return null;

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date && s.service_date >= wsStr && s.service_date <= weStr);
  const monthServices = services.filter(s => s.service_date?.startsWith(monthStr));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-2 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5"><Scissors className="w-3 h-3" />{t("commissionSplits")}</p>
          <p className="font-serif text-base font-medium mt-0.5">{t("commissionStylists")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {[{ v: "monthly", label: t("monthly") }, { v: "weekly", label: t("weekly") }].map(({ v, label }) => (
            <button key={v} onClick={() => setView(v)} className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize", view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {label}
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
            const existingPayout = commPayouts?.find(p => p.renter_id === r.id && p.period === monthStr);
            return (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.role} · {rs.length} {t("services")} · {r.commission_owner || 40}% / {100 - (r.commission_owner || 40)}% {t("split")}</p>
                  {existingPayout?.status === "paid" && (
                    <p className="text-xs text-emerald-500 mt-0.5">✓ Payout sent · {new Date(existingPayout.paid_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end text-xs">
                  <div className="text-right"><p className="text-muted-foreground">{t("revenue")}</p><p className="font-mono font-semibold">{formatCurrency(gross)}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">{t("stylist")}</p><p className="font-mono">{formatCurrency(stylistCut)}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">{t("owner")}</p><p className="font-mono text-primary font-semibold">{formatCurrency(ownerCut)}</p></div>
                  {existingPayout?.status !== "paid" && stylistCut > 0 && (
                    <GoldButton size="sm" onClick={async () => {
                      if (existingPayout) {
                        await base44.entities.CommissionPayout.update(existingPayout.id, { status: "paid", paid_date: new Date().toISOString(), amount: stylistCut });
                      } else {
                        await base44.entities.CommissionPayout.create({ renter_id: r.id, period: monthStr, amount: stylistCut, status: "paid", paid_date: new Date().toISOString() });
                      }
                      onRefresh();
                    }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Payout Sent
                    </GoldButton>
                  )}
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
                {[t("stylists"), t("services"), t("totalRevenue"), t("stylistsEarnings"), `${t("ourCommission")} ✦`, t("split")].map(h => (
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
    setShowAdd(false); toast({ title: t("chargeAdded") }); onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("chargesLedger")}</p>
          <p className="font-serif text-base font-medium mt-0.5">{t("recurringCharges")}</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowAdd(s => !s)}>
        <Plus className="w-3.5 h-3.5 mr-1" />{t("addCharge")}
        </Button>
      </div>
      {showAdd && (
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap gap-2 items-end">
          <Input placeholder={`${t("description")} *`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="flex-1 min-w-[140px] min-h-[44px]" />
          <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
            <SelectTrigger className="w-36 min-h-[44px]"><SelectValue placeholder={t("selectStylist")} /></SelectTrigger>
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
        <p className="text-sm text-muted-foreground text-center py-8">{t("noRecurringCharges")}</p>
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
  // Show history relative to the currently-viewed month, not always relative to today
  const [curYr, curMo] = currentMonth.split("-").map(Number);
  const prevMonths = [1, 2, 3].map(offset => {
    const d = new Date(curYr, curMo - 1 - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Check for exact month-period payment history (exclude weekly sub-payments)
  const hasHistory = renters.some(r => allPayments.some(p => p.renter_id === r.id && prevMonths.includes(p.period)));
  if (!hasHistory) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("paymentHistory")}</p>
        <p className="font-serif text-base font-medium mt-0.5">{t("last3Months")}</p>
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
                  // Only exact month-period payments represent a full payment status
                  const p = allPayments.find(x => x.renter_id === r.id && x.period === m);
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