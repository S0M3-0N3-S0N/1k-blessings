import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  formatCurrency, calcMonthlyRent, categoryBadge, getInitials,
  getAvatarColor, cn, isPaymentOverdue, getDueDate, isBeforeStartDate,
  PAYMENT_METHOD_LABELS, getWeekStart, getWeekEnd
} from "@/lib/utils";
import {
  Loader2, AlertCircle, CheckCircle2, TrendingUp, Users,
  DollarSign, Scissors, ArrowRight, Calendar, Clock
} from "lucide-react";
import GoldButton from "@/components/ui/GoldButton.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markDialog, setMarkDialog] = useState(null);
  const [markMethod, setMarkMethod] = useState("cash");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, s, p, e] = await Promise.all([
        base44.entities.Renter.list(),
        base44.entities.ServiceEntry.list("-service_date", 200),
        base44.entities.Payment.list("-period"),
        base44.entities.Expense.list("-expense_date", 100),
      ]);
      setRenters(r); setServices(s); setPayments(p); setExpenses(e);
      setLoading(false);
    } catch (err) {
      setError("Failed to load. Pull down to retry.");
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-destructive">{error}</p>
      <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Retry</button>
    </div>
  );

  // ── Derived state ──────────────────────────────────────────────
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = now.toISOString().split("T")[0];

  // Week bounds (Mon–Sun)
  const ws = getWeekStart(now, 0);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];

  const activeRenters = renters.filter(r => r.status === "active");
  const rentRenters = activeRenters.filter(r => r.payment_model === "rent" && !isBeforeStartDate(currentMonthStr, r));
  const commissionRenters = activeRenters.filter(r => r.payment_model === "commission");

  // Rent collection this month
  const paidRenterIds = new Set(
    payments.filter(p => p.status === "paid" && p.period === currentMonthStr).map(p => p.renter_id)
  );
  const monthlyProjected = rentRenters.reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);
  const monthlyCollected = rentRenters
    .filter(r => paidRenterIds.has(r.id))
    .reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);
  const collectionPct = monthlyProjected > 0 ? Math.round((monthlyCollected / monthlyProjected) * 100) : 0;

  // Commission this week
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const weekCommission = weekServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);
  const weekRevenue = weekServices.reduce((s, e) => s + (e.amount || 0), 0);

  // Rent rows with status
  const rentRows = rentRenters.map(r => {
    const payment = payments.find(p => p.renter_id === r.id && p.period === currentMonthStr);
    const isPaid = payment?.status === "paid";
    const overdue = !isPaid && isPaymentOverdue(payment, r);
    return { ...r, monthlyAmt: calcMonthlyRent(r, currentMonthStr), paid: isPaid, overdue, payment };
  });
  const overdueCount = rentRows.filter(r => r.overdue).length;
  const paidCount = rentRows.filter(r => r.paid).length;

  // Today's services
  const todayServices = services.filter(s => s.service_date === todayStr);
  const todayRevenue = todayServices.reduce((s, e) => s + (e.amount || 0), 0);
  const todayCommission = todayServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);

  // This month's expenses
  const monthExpenses = expenses
    .filter(e => e.expense_date?.startsWith(currentMonthStr))
    .reduce((s, e) => s + (e.amount || 0), 0);

  // Upcoming birthdays (next 7 days)
  const upcomingBirthdays = renters.filter(r => {
    if (!r.birthday) return false;
    const [, bMo, bDay] = r.birthday.split("-").map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bdate = new Date(today.getFullYear(), bMo - 1, bDay);
    const bNext = new Date(today.getFullYear() + 1, bMo - 1, bDay);
    const diff = ((bdate >= today ? bdate : bNext) - today) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  // Recent 6 services
  const recentServices = services.slice(0, 6);
  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  // Helper: weekly amount for mark-paid dialog
  const getWeeklyAmt = (renter) => {
    if (renter.frequency === "weekly") return renter.rent_amount || 0;
    if (renter.frequency === "biweekly") return (renter.rent_amount || 0) / 2;
    return parseFloat(((renter.rent_amount || 0) / (52 / 12)).toFixed(2));
  };

  const confirmMarkPaid = async () => {
    if (!markDialog) return;
    const renter = markDialog.renter;
    setMarkingId(renter.id);
    try {
      const existing = markDialog.payment;
      const data = {
        status: "paid",
        paid_date: new Date().toISOString(),
        due_date: getDueDate(currentMonthStr, renter.frequency),
        amount: calcMonthlyRent(renter, currentMonthStr),
        payment_method: markMethod,
      };
      if (existing) {
        await base44.entities.Payment.update(existing.id, data);
      } else {
        await base44.entities.Payment.create({ renter_id: renter.id, period: currentMonthStr, ...data });
      }
      window.dispatchEvent(new CustomEvent("overdueCountChanged"));
      setMarkDialog(null);
      await loadData();
    } catch (err) {
      console.error("Mark paid error:", err);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">1K Blessings</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{greeting} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* ── Alerts ── */}
        {overdueCount > 0 && (
          <div className="bg-red-500/8 border border-red-500/30 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{overdueCount} overdue payment{overdueCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Rent past due for {overdueCount} stylist{overdueCount > 1 ? "s" : ""}</p>
              </div>
            </div>
            <Link to="/payments" className="text-xs font-semibold text-red-500 shrink-0 flex items-center gap-1 hover:underline">
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {upcomingBirthdays.length > 0 && (
          <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-primary mb-1.5">🎂 Upcoming Birthdays</p>
            {upcomingBirthdays.map((r, i) => {
              const [, bMo, bDay] = r.birthday.split("-").map(Number);
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const bdate = new Date(today.getFullYear(), bMo - 1, bDay);
              const bNext = new Date(today.getFullYear() + 1, bMo - 1, bDay);
              const diff = Math.round(((bdate >= today ? bdate : bNext) - today) / 86400000);
              return (
                <p key={i} className="text-xs text-foreground/80">
                  <span className="font-medium">{r.name}</span> · {diff === 0 ? "🎉 Today!" : `in ${diff} day${diff !== 1 ? "s" : ""}`}
                </p>
              );
            })}
          </div>
        )}

        {/* ── 4 KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Rent collected */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rent Collected</p>
            <p className="font-mono text-2xl font-bold text-primary">{formatCurrency(monthlyCollected)}</p>
            <p className="text-[10px] text-muted-foreground">of {formatCurrency(monthlyProjected)} · {collectionPct}%</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${collectionPct}%` }} />
            </div>
          </div>
          {/* Commission this week */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Our Commission</p>
            <p className="font-mono text-2xl font-bold">{formatCurrency(weekCommission)}</p>
            <p className="text-[10px] text-muted-foreground">from {formatCurrency(weekRevenue)} revenue · this week</p>
          </div>
          {/* Today */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
            <p className="font-mono text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">{todayServices.length} service{todayServices.length !== 1 ? "s" : ""} · {formatCurrency(todayCommission)} ours</p>
          </div>
          {/* Stylists */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Stylists</p>
            <p className="font-mono text-2xl font-bold">{activeRenters.length}</p>
            <p className="text-[10px] text-muted-foreground">{rentRenters.length} rent · {commissionRenters.length} commission</p>
          </div>
        </div>

        {/* ── Rent Collection Status ── */}
        {rentRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Rent Collection</p>
                <p className="font-serif text-base font-medium mt-0.5">
                  {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} · {paidCount}/{rentRows.length} paid
                </p>
              </div>
              <Link to="/payments" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {rentRows.map(r => {
                const av = getAvatarColor(renters.indexOf(renters.find(x => x.id === r.id)));
                return (
                  <div key={r.id} className={cn("flex items-center justify-between px-5 py-3.5 gap-3", r.overdue && "border-l-2 border-l-red-500 bg-red-500/5")}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
                        {getInitials(r.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(r.monthlyAmt)}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.paid ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : r.overdue ? (
                        <GoldButton size="sm" onClick={() => { setMarkMethod("cash"); setMarkDialog({ renter: r, payment: r.payment }); }} disabled={markingId === r.id}>
                          {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Overdue — Mark Paid
                        </GoldButton>
                      ) : (
                        <GoldButton size="sm" onClick={() => { setMarkMethod("cash"); setMarkDialog({ renter: r, payment: r.payment }); }} disabled={markingId === r.id}>
                          {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Mark Paid
                        </GoldButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── This Week's Commission Breakdown ── */}
        {commissionRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                  <Scissors className="w-3 h-3" /> Commission This Week
                </p>
                <p className="font-serif text-base font-medium mt-0.5">
                  {ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {we.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <Link to="/payments" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                Full splits <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {commissionRenters.map((r, i) => {
                const rs = weekServices.filter(s => s.renter_id === r.id);
                const gross = rs.reduce((s, e) => s + (e.amount || 0), 0);
                const ownerCut = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
                const av = getAvatarColor(i);
                return (
                  <div key={r.id} className={cn("flex items-center justify-between px-5 py-3.5 gap-3", gross === 0 && "opacity-50")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
                        {getInitials(r.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{rs.length} service{rs.length !== 1 ? "s" : ""} · {formatCurrency(gross)} gross</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-primary">{formatCurrency(ownerCut)}</p>
                      <p className="text-[10px] text-muted-foreground">our cut</p>
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-3 bg-muted/20 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Week Total</p>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-primary">{formatCurrency(weekCommission)}</p>
                  <p className="text-[10px] text-muted-foreground">from {formatCurrency(weekRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Today's Activity ── */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Today's Activity
              </p>
              <p className="font-serif text-base font-medium mt-0.5">
                {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
            <Link to="/services" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              Log service <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {todayServices.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-muted-foreground">No services logged today</p>
              <Link to="/services" className="text-xs text-primary hover:underline">Add one →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayServices.map(s => {
                const cat = categoryBadge(s.category);
                const stylist = renterMap[s.renter_id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.client_name || "Client"}{s.description ? ` · ${s.description}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{stylist?.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold">{formatCurrency(s.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(s.owner_earnings)} ours</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Recent Services (this week) ── */}
        {recentServices.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Recent Services</p>
                <p className="font-serif text-base font-medium mt-0.5">Last logged</p>
              </div>
              <Link to="/services" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentServices.map(s => {
                const cat = categoryBadge(s.category);
                const stylist = renterMap[s.renter_id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.client_name || "Client"}{s.description ? ` · ${s.description}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{stylist?.name} · {s.service_date}</p>
                      </div>
                    </div>
                    <p className="font-mono text-sm font-semibold shrink-0">{formatCurrency(s.amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick Nav ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">Quick Access</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Payments", to: "/payments", icon: DollarSign, badge: overdueCount > 0 ? overdueCount : null },
              { label: "Services", to: "/services", icon: Scissors },
              { label: "Stylists", to: "/renters", icon: Users },
              { label: "Reports", to: "/reports", icon: TrendingUp },
              { label: "Expenses", to: "/expenses", icon: Calendar },
            ].map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="relative flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 hover:border-primary/40 transition-all min-h-[52px]"
              >
                <l.icon className="w-4 h-4 text-primary shrink-0" />
                {l.label}
                {l.badge && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {l.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mark Paid Dialog ── */}
      <Dialog open={!!markDialog} onOpenChange={() => setMarkDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Paid — {markDialog?.renter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/30 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="font-mono font-bold text-2xl text-primary">
                {markDialog && formatCurrency(calcMonthlyRent(markDialog.renter, currentMonthStr))}
              </p>
              <p className="text-[10px] text-muted-foreground">Full month — {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Payment Method</label>
              <Select value={markMethod} onValueChange={setMarkMethod}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setMarkDialog(null)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={confirmMarkPaid} disabled={markingId !== null}>
                {markingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Paid
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}