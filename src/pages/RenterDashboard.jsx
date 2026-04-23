import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, Scissors, DollarSign, TrendingUp, Clock } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import ClockInOut from "@/components/renter/ClockInOut";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { useEffect as useEffectChart } from "react";

export default function RenterDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle invite link auto-linking
  useEffect(() => {
    if (!user?.email) return;
    const params = new URLSearchParams(window.location.search);
    const linkRenterId = params.get("link_renter");
    if (!linkRenterId) return;
    base44.entities.Renter.filter({ id: linkRenterId }).then(async (results) => {
      const target = results[0];
      if (target && !target.user_email) {
        await base44.entities.Renter.update(target.id, { user_email: user.email });
      }
      // Remove param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("link_renter");
      window.history.replaceState({}, "", url.toString());
    });
  }, [user?.email]);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, allServices] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.ServiceEntry.list("-service_date", 200),
    ]);
    const r = renters[0] || null;
    setRenter(r);
    if (r) {
      setServices(allServices.filter(s => s.renter_id === r.id));
      if (r.payment_model === "hourly") {
        const entries = await base44.entities.TimeEntry.filter({ renter_id: r.id });
        setTimeEntries(entries);
      }
    }
    setLoading(false);
  }, [user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  const ws = getWeekStart();
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);

  const weekTimeEntries = timeEntries.filter(e => {
    const d = e.clock_in?.split("T")[0];
    return d >= wsStr && d <= weStr;
  });

  const weekGross = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const weekEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const weekTips = weekServices.reduce((s, e) => s + (e.tip_amount || 0), 0);
  const weeklyRent = (renter?.payment_model === "rent" || renter?.payment_model === "hourly")
    ? toWeekly(renter.rent_amount || 0, renter.frequency)
    : 0;

  // Hourly
  const totalHours = weekTimeEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const grossPay = totalHours * (renter?.hourly_wage || 0);
  const hourlyNetPay = grossPay - weeklyRent;

  const netPay = renter?.payment_model === "rent"
    ? weekGross - weeklyRent
    : renter?.payment_model === "hourly"
      ? hourlyNetPay
      : weekEarnings + weekTips;

  // Chart
  const chartData = weekServices.reduce((acc, s) => {
    const day = new Date(s.service_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
    const existing = acc.find(x => x.day === day);
    if (existing) {
      existing.earnings += s.renter_earnings || 0;
      existing.owner += s.owner_earnings || 0;
    } else {
      acc.push({ day, earnings: s.renter_earnings || 0, owner: s.owner_earnings || 0 });
    }
    return acc;
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!renter) return (
    <div className="text-center py-20 space-y-3">
      <p className="font-serif text-2xl font-light">Hi {user?.full_name?.split(" ")[0] || "there"} ✦</p>
      <p className="text-muted-foreground text-sm">{t("notLinked")}</p>
      <p className="text-xs text-muted-foreground">{t("linkEmailNote")}</p>
    </div>
  );

  const heroLabel = renter.payment_model === "rent"
    ? t("thisWeekNetRevenue")
    : renter.payment_model === "hourly"
      ? t("thisWeekNetPay")
      : t("thisWeekEarnings");

  const heroSub = renter.payment_model === "rent"
    ? `${formatCurrency(weekGross)} gross − ${formatCurrency(weeklyRent)} rent`
    : renter.payment_model === "hourly"
      ? `${totalHours.toFixed(2)}h × ${formatCurrency(renter.hourly_wage)}/hr − ${formatCurrency(weeklyRent)} rent`
      : `${formatCurrency(weekEarnings)} commission + ${formatCurrency(weekTips)} tips`;

  const kpiThird = renter.payment_model === "rent"
  ? { label: t("weeklyRentDeduction"), value: formatCurrency(weeklyRent) }
  : renter.payment_model === "hourly"
    ? { label: t("hoursThisWeek"), value: `${totalHours.toFixed(1)}h` }
    : { label: t("commission"), value: `${100 - (renter.commission_owner || 40)}%` };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("myStudio")}</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{greeting}, {user?.full_name?.split(" ")[0] || "there"} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        {/* Hero */}
        <div className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden shadow-[0_0_30px_rgba(201,152,74,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary relative">{heroLabel}</p>
          <p className={cn("font-mono text-5xl font-semibold tracking-tight mt-2 relative", netPay < 0 && "text-destructive")}>{formatCurrency(netPay)}</p>
          <p className="text-xs text-muted-foreground mt-2 relative">{heroSub}</p>
          <p className="text-xs text-muted-foreground mt-0.5 relative">{formatDateRange(ws)}</p>
        </div>

        {/* Hourly: Clock In/Out */}
        {renter.payment_model === "hourly" && (
          <ClockInOut renterId={renter.id} onRefresh={loadData} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label={t("services")} value={weekServices.length} icon={Scissors} />
          <KpiCard label={t("revenue")} value={formatCurrency(weekGross)} icon={TrendingUp} />
          <KpiCard label={kpiThird.label} value={kpiThird.value} icon={renter.payment_model === "hourly" ? Clock : DollarSign} />
        </div>

        {/* Services this week */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("thisWeek")}</p>
              <p className="font-serif text-base font-medium mt-0.5">{t("myServices")}</p>
            </div>
            <Link to="/services" className="text-xs text-primary hover:underline">{t("logService")} →</Link>
          </div>
          {weekServices.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-muted-foreground">{t("noServicesThisWeek")}</p>
              <Link to="/services" className="text-xs text-primary hover:underline">{t("logFirst")}</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {weekServices.map(s => {
                const cat = categoryBadge(s.category);
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 min-h-[52px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.description || "Service"}</p>
                        <p className="text-xs text-muted-foreground">{s.client_name || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold">{formatCurrency(s.renter_earnings)}</p>
                      {renter.payment_model === "commission" && <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>}
                    </div>
                  </div>
                );
              })}
              {weekTips > 0 && (
                <div className="flex items-center justify-between px-5 py-3 bg-primary/5 min-h-[44px]">
                  <p className="text-sm text-muted-foreground font-medium">{t("tips")} {t("thisWeek")}</p>
                  <p className="font-mono text-sm font-semibold text-primary">+{formatCurrency(weekTips)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Earnings Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 relative overflow-hidden shadow-[0_0_20px_rgba(201,152,74,0.08)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("earningsThisWeek") || "Earnings Trend"}</p>
                  <p className="font-serif text-lg font-medium mt-1 text-foreground">{t("dailyBreakdown") || "Daily Breakdown"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">{t("thisWeek")}</p>
                  <p className="font-mono text-lg font-semibold text-primary mt-1">{formatCurrency(weekEarnings)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip 
                    formatter={(v) => formatCurrency(v)} 
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} 
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5 }} activeDot={{ r: 7 }} name={t("yourEarnings") || "Your Earnings"} isAnimationActive={true} animationDuration={500} />
                  {renter.payment_model === "commission" && <Line type="monotone" dataKey="owner" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ fill: "hsl(var(--muted-foreground))", r: 4 }} activeDot={{ r: 6 }} name={t("ownersCut") || "Owner's Cut"} strokeDasharray="5 5" isAnimationActive={true} animationDuration={500} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:flex md:gap-2 gap-2">
          <Link to="/paystub" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center">{t("paystub")}</Link>
          <Link to="/services" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center md:flex-1">{t("logService")}</Link>
          <Link to="/messages" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center md:flex-1">{t("messages")}</Link>
        </div>
      </div>
    </PullToRefresh>
  );
}