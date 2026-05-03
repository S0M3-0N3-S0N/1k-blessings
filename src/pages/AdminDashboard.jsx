import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, toWeekly, freqMultiplier, categoryBadge, getInitials, getAvatarColor, cn, isPaymentOverdue, getDueDate, isBeforeStartDate, calcMonthlyRent } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, DollarSign, Users, Scissors, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);

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
    }).catch(err => console.error('Overdue check error:', err));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [r, s, p, c] = await Promise.all([
        base44.entities.Renter.list(),
        base44.entities.ServiceEntry.list("-service_date", 100),
        base44.entities.Payment.list("-period"),
        base44.entities.Client.list(),
      ]);
      setRenters(r); setServices(s); setPayments(p); setClients(c); setLoading(false);
    } catch (err) {
      console.error('Load error:', err);
      setError("Failed to load data. Pull down to retry.");
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
      <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">{t("retry")}</button>
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
  const hourlyRenters = []; // removed hourly model

  // KPIs
  const monthlyRentProjected = rentRenters.reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);
  const paidRenterIds = new Set(payments.filter(p => p.status === "paid" && p.period?.startsWith(currentMonthStr)).map(p => p.renter_id));
  const collectedThisMonth = rentRenters.filter(r => paidRenterIds.has(r.id)).reduce((s, r) => s + calcMonthlyRent(r, currentMonthStr), 0);

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
  const rentRows = renters
    .filter(r => r.payment_model === "rent" && r.status === "active" && !isBeforeStartDate(currentMonthStr, r))
    .map(r => {
      const monthlyAmt = calcMonthlyRent(r, currentMonthStr);
      const payment = payments.find(p => p.renter_id === r.id && p.period?.startsWith(currentMonthStr));
      const isPaid = payment?.status === "paid";
      const overdue = !isPaid && isPaymentOverdue(payment, r);
      const status = isPaid ? "paid" : overdue ? "overdue" : "pending";
      return { ...r, monthlyAmt, paid: isPaid, status };
    });

  const markPaid = async (renter) => {
    setMarkingId(renter.id);
    try {
      const existing = payments.find(p => p.renter_id === renter.id && p.period?.startsWith(currentMonthStr));
      if (existing) {
        await base44.entities.Payment.update(existing.id, { status: "paid", paid_date: new Date().toISOString(), due_date: getDueDate(currentMonthStr, renter.frequency) });
      } else {
        await base44.entities.Payment.create({ renter_id: renter.id, amount: calcMonthlyRent(renter, currentMonthStr), period: currentMonthStr, status: "paid", paid_date: new Date().toISOString(), due_date: getDueDate(currentMonthStr, renter.frequency) });
      }
      await loadData();
      // Refresh overdue count
      setOverdueCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark paid error:', err);
    } finally {
      setMarkingId(null);
    }
  };



  // Birthday reminders (next 7 days)
  const upcomingBirthdays = [...renters, ...clients].filter(p => {
    if (!p.birthday) return false;
    const [, bMo, bDay] = p.birthday.split('-').map(Number);
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), bMo - 1, bDay);
    const diff = (thisYear - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  // Today's schedule
  const todayDateStr = now.toISOString().split("T")[0];
  const todayServices = services.filter(s => s.service_date === todayDateStr);

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

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="bg-red-500/8 border border-red-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{overdueCount} overdue payment{overdueCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Rent is past due for {overdueCount} stylist{overdueCount > 1 ? "s" : ""}</p>
              </div>
            </div>
            <Link to="/payments" className="text-xs font-semibold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors shrink-0">Review →</Link>
          </div>
        )}

        {/* Birthday reminders */}
        {upcomingBirthdays.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-primary">🎂 Upcoming Birthdays</p>
            {upcomingBirthdays.map((p, i) => {
              const [, bMo, bDay] = p.birthday.split('-').map(Number);
              const today = new Date();
              const thisYear = new Date(today.getFullYear(), bMo - 1, bDay);
              const diff = Math.round((thisYear - today) / (1000 * 60 * 60 * 24));
              return (
                <p key={i} className="text-xs text-foreground/80">
                  {p.name} · {p.role || "Client"} · {diff === 0 ? "🎉 Today!" : `in ${diff} day${diff !== 1 ? "s" : ""}`}
                </p>
              );
            })}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t("collected")} value={formatCurrency(collectedThisMonth)} icon={TrendingUp} accent glow sub={t("thisMonth")} />
          <KpiCard label={t("ourCommission")} value={formatCurrency(weekOwnerCommission)} icon={Scissors} sub={t("thisWeek")} />
          <KpiCard label={t("activeStylists")} value={activeRenters.length} icon={Users} sub={`${rentRenters.length} ${t("rent")} · ${commissionRenters.length} ${t("commission")}`} />
          <KpiCard label={t("overdue")} value={overdueCount} icon={AlertCircle} className={overdueCount > 0 ? "border-red-500/40 bg-red-500/5" : ""} sub={overdueCount > 0 ? "needs attention" : "all clear"} />
        </div>

        {/* Rent Collection Progress */}
        {rentRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border px-5 py-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">{t("collected")} / {t("monthlyRent")}</span>
              <span className="font-mono font-semibold">{formatCurrency(collectedThisMonth)} <span className="text-muted-foreground">/ {formatCurrency(monthlyRentProjected)}</span></span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${monthlyRentProjected > 0 ? Math.min(100, (collectedThisMonth / monthlyRentProjected) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{rentRows.filter(r => r.status === "paid").length}/{rentRows.length} {t("paid")}</span>
              <span>{monthlyRentProjected > 0 ? Math.round((collectedThisMonth / monthlyRentProjected) * 100) : 0}%</span>
            </div>
          </div>
        )}

        {/* Commission Summary Card */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("commissionSplits")}</p>
              <p className="font-serif text-base font-medium mt-0.5">{t("weekOf")} {ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatDateRange(ws)}</p>
            </div>
            <Link to="/payments" className="text-xs text-primary hover:underline font-medium">{t("viewFullSplits")}</Link>
          </div>
          {commissionRenters.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">{t("commissionOnlyNote")}</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {commRows.map(r => (
                <div key={r.id} className={cn("flex-1 min-w-[140px] bg-muted/30 rounded-lg px-4 py-3 space-y-1", r.gross === 0 && "opacity-50")}>
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="font-mono text-sm font-bold text-primary">{formatCurrency(r.ownerCut)} <span className="text-[10px] font-normal text-muted-foreground">{t("ours")}</span></p>
                  <p className="text-[10px] text-muted-foreground">{r.rs.length} {t("services")} · {formatCurrency(r.gross)} total</p>
                </div>
              ))}
              <div className="flex-1 min-w-[140px] bg-primary/10 rounded-lg px-4 py-3 space-y-1 border border-primary/20">
                <p className="text-xs font-semibold text-primary">{t("totalThisWeek")}</p>
                <p className="font-mono text-sm font-bold text-primary">{formatCurrency(commRows.reduce((s, r) => s + r.ownerCut, 0))}</p>
                <p className="text-[10px] text-muted-foreground">{commRows.reduce((s, r) => s + r.rs.length, 0)} {t("services")} · {formatCurrency(commRows.reduce((s, r) => s + r.gross, 0))} {t("revenue")}</p>
              </div>
            </div>
          )}
        </div>



        {/* Rent Due */}
        {rentRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("rentDue")}</p>
                <p className="font-serif text-base font-medium mt-0.5">{t("thisWeek")} · {t("rentStylists")}</p>
              </div>
              <Link to="/payments" className="text-xs text-primary hover:underline font-medium">{t("viewAll")}</Link>
            </div>
            <div className="divide-y divide-border">
              {rentRows.map(r => (
                <div key={r.id} className={cn("flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 gap-3 flex-wrap", r.status === "overdue" && "border-l-2 border-l-red-500")}>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.role}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{formatCurrency(r.monthlyAmt)}</span>
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

        {/* Today's Schedule */}
        {todayServices.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Today's Schedule</p>
              <p className="font-serif text-base font-medium mt-0.5">{todayServices.length} service{todayServices.length !== 1 ? "s" : ""} today</p>
            </div>
            <div className="divide-y divide-border">
              {todayServices.map(s => {
                const cat = categoryBadge(s.category);
                const stylist = renterMap[s.renter_id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.client_name || "Client"}</p>
                        <p className="text-xs text-muted-foreground">{stylist?.name}{s.service_time ? ` · ${s.service_time}` : ""}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold shrink-0">{formatCurrency(s.amount)}</span>
                  </div>
                );
              })}
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
            <p className="text-sm text-muted-foreground text-center py-8">{t("noServicesLogged")} <Link to="/services" className="text-primary hover:underline">{t("logOne")}</Link></p>
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
                      <p className="text-[10px] text-muted-foreground">{t("ourCommission")}: {formatCurrency(s.owner_earnings)}</p>
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