import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, toWeekly, freqMultiplier, categoryBadge, getInitials, getAvatarColor, cn, isPaymentOverdue } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, DollarSign, Users, Scissors, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [markingId, setMarkingId] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    Promise.all([base44.entities.Payment.list(), base44.entities.Renter.list()]).then(([payments, renters]) => {
      const rentRenters = renters.filter(r => r.payment_model === "rent" && r.status === "active");
      let count = 0;
      rentRenters.forEach(r => {
        const payment = payments.find(p => p.renter_id === r.id && p.period?.startsWith(currentMonthStr));
        if (isPaymentOverdue(payment, r)) count++;
      });
      setOverdueCount(count);
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, s, p, te] = await Promise.all([
        base44.entities.Renter.list(),
        base44.entities.ServiceEntry.list("-service_date", 100),
        base44.entities.Payment.list("-period"),
        base44.entities.TimeEntry.list("-clock_in", 200),
      ]);
      setRenters(r); setServices(s); setPayments(p); setTimeEntries(te); setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load data. Pull down to retry.');
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <div className="text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
      <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Retry</button>
    </div>
  );

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const activeRenters = renters.filter(r => r.status === "active");
  const rentRenters = activeRenters.filter(r => r.payment_model === "rent");
  const commissionRenters = activeRenters.filter(r => r.payment_model === "commission");
  const hourlyRenters = activeRenters.filter(r => r.payment_model === "hourly");

  // KPIs
  const monthlyRentProjected = rentRenters.reduce((s, r) => s + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0);
  const collectedThisMonth = payments.filter(p => p.status === "paid" && p.period?.startsWith(currentMonthStr)).reduce((s, p) => s + (p.amount || 0), 0);

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const weekOwnerCommission = weekServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);

  // Commission splits
  const commRows = commissionRenters.map((r, i) => {
    const rs = weekServices.filter(s => s.renter_id === r.id);
    const gross = rs.reduce((s, e) => s + (e.amount || 0), 0);
    const ownerCut = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
    const stylistCut = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
    return { ...r, rs, gross, ownerCut, stylistCut, avatarIndex: i };
  });

  // Rent due
  const rentRows = rentRenters.map(r => {
    const weeklyAmt = toWeekly(r.rent_amount || 0, r.frequency);
    const payment = payments.find(p => p.renter_id === r.id && p.period === wsStr);
    const status = payment?.status || "pending";
    const overdue = !payment || isPaymentOverdue(payment, r);
    return { ...r, weeklyAmt, paid: !!payment, status: !payment && overdue ? "overdue" : status };
  });

  const markPaid = async (renter) => {
    setMarkingId(renter.id);
    const existing = payments.find(p => p.renter_id === renter.id && p.period === wsStr);
    if (existing) {
      await base44.entities.Payment.update(existing.id, { status: "paid", paid_date: new Date().toISOString() });
    } else {
      await base44.entities.Payment.create({ renter_id: renter.id, amount: renter.weeklyAmt, period: wsStr, status: "paid", paid_date: new Date().toISOString() });
    }
    setMarkingId(null); loadData();
  };

  // Hourly payroll this week
  const weekTimeEntries = timeEntries.filter(e => {
    const d = e.clock_in?.split("T")[0];
    return d >= wsStr && d <= weStr;
  });
  const hourlyRows = hourlyRenters.map((r, i) => {
    const entries = weekTimeEntries.filter(e => e.renter_id === r.id);
    const totalHours = entries.reduce((s, e) => s + (e.total_hours || 0), 0);
    const grossPay = totalHours * (r.hourly_wage || 0);
    const weeklyDeduction = toWeekly(r.rent_amount || 0, r.frequency);
    const netPay = grossPay - weeklyDeduction;
    const clockedIn = entries.some(e => e.clock_in && !e.clock_out);
    return { ...r, totalHours, grossPay, weeklyDeduction, netPay, clockedIn, avatarIndex: i };
  });

  // Recent services (last 5)
  const recentServices = services.slice(0, 5);
  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("adminDashboard")}</p>
          <h1 className="font-serif text-3xl md:text-4xl font-light tracking-wide">{greeting} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t("monthlyRent")} value={formatCurrency(monthlyRentProjected)} icon={DollarSign} accent glow sub="projected · rent model" />
          <KpiCard label={t("collected")} value={formatCurrency(collectedThisMonth)} icon={TrendingUp} sub="this month" />
          <KpiCard label={t("ourCommission")} value={formatCurrency(weekOwnerCommission)} icon={Scissors} sub="this week · commission" />
          <KpiCard label={t("activeStylists")} value={activeRenters.length} icon={Users} sub={`${rentRenters.length} rent · ${commissionRenters.length} comm · ${hourlyRenters.length} hourly`} />
        </div>

        {/* Commission Summary Card */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("commissionSplits")}</p>
              <p className="font-serif text-base font-medium mt-0.5">{t("weekOf")} {ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatDateRange(ws)}</p>
            </div>
            <Link to="/payments" className="text-xs text-primary hover:underline font-medium">View Full Splits →</Link>
          </div>
          {commissionRenters.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">{t("commissionOnlyNote")}</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {commRows.map(r => (
                <div key={r.id} className={cn("flex-1 min-w-[140px] bg-muted/30 rounded-lg px-4 py-3 space-y-1", r.gross === 0 && "opacity-50")}>
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="font-mono text-sm font-bold text-primary">{formatCurrency(r.ownerCut)} <span className="text-[10px] font-normal text-muted-foreground">ours</span></p>
                  <p className="text-[10px] text-muted-foreground">{r.rs.length} services · {formatCurrency(r.gross)} total</p>
                </div>
              ))}
              <div className="flex-1 min-w-[140px] bg-primary/10 rounded-lg px-4 py-3 space-y-1 border border-primary/20">
                <p className="text-xs font-semibold text-primary">Total This Week</p>
                <p className="font-mono text-sm font-bold text-primary">{formatCurrency(commRows.reduce((s, r) => s + r.ownerCut, 0))}</p>
                <p className="text-[10px] text-muted-foreground">{commRows.reduce((s, r) => s + r.rs.length, 0)} services · {formatCurrency(commRows.reduce((s, r) => s + r.gross, 0))} revenue</p>
              </div>
            </div>
          )}
        </div>

        {/* Hourly Payroll - compact summary */}
        {hourlyRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("hourlyPayroll")}</p>
                <p className="font-serif text-base font-medium mt-0.5">{t("thisWeek")} · {t("hourlyStylists")}</p>
              </div>
              <Link to="/paystub" className="text-xs text-primary hover:underline font-medium">View Paystub →</Link>
            </div>
            <div className="divide-y divide-border">
              {hourlyRows.map(r => {
                const av = getAvatarColor(r.avatarIndex);
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>{getInitials(r.name)}</div>
                      <div>
                        <p className="font-medium text-sm">{r.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", r.clockedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                          <span className="text-xs text-muted-foreground">{r.totalHours.toFixed(1)}h · {formatCurrency(r.hourly_wage)}/hr</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-semibold", r.netPay >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(r.netPay)}</p>
                      <p className="text-[10px] text-muted-foreground">net pay</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rent Due */}
        {rentRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("rentDue")}</p>
                <p className="font-serif text-base font-medium mt-0.5">{t("thisWeek")} · {t("rentStylists")}</p>
              </div>
              <Link to="/payments" className="text-xs text-primary hover:underline font-medium">View All →</Link>
            </div>
            <div className="divide-y divide-border">
              {rentRows.map(r => (
                <div key={r.id} className={cn("flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 gap-3 flex-wrap", r.status === "overdue" && "border-l-2 border-l-red-500")}>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.role}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{formatCurrency(r.weeklyAmt)}</span>
                    <StatusBadge status={r.status} />
                    {!r.paid && (
                      <GoldButton size="sm" onClick={() => markPaid(r)} disabled={markingId === r.id}>
                        {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {t("markPaid")}
                      </GoldButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Services */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("recentActivity")}</p>
              <p className="font-serif text-base font-medium mt-0.5">{t("recentServices")}</p>
            </div>
            <Link to="/services" className="text-xs text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          {recentServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noServicesLogged")} <Link to="/services" className="text-primary hover:underline">Log one →</Link></p>
          ) : (
            <div className="divide-y divide-border">
              {recentServices.map(s => {
                const cat = categoryBadge(s.category);
                const stylist = renterMap[s.renter_id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.client_name || "Client"} {s.description ? `· ${s.description}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{stylist?.name} · {s.service_date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold">{formatCurrency(s.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">ours: {formatCurrency(s.owner_earnings)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">{t("quickAccess")}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: t("payments"), to: "/payments" }, { label: t("services"), to: "/services" },
              { label: t("stylists"), to: "/renters" }, { label: t("reports"), to: "/reports" },
              { label: t("expenses"), to: "/expenses" }, { label: t("messages"), to: "/messages" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 hover:border-primary/40 transition-all min-h-[44px] flex items-center">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}