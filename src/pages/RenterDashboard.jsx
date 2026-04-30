import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, Scissors, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import PaymentLinksPanel from "@/components/payments/PaymentLinksPanel.jsx";
import { useState as useLocalState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";


export default function RenterDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [showPayment, setShowPayment] = useLocalState(false);

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

  const weekGross = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const weekEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const weekTips = weekServices.reduce((s, e) => s + (e.tip_amount || 0), 0);
  const weeklyRent = renter?.payment_model === "rent"
    ? toWeekly(renter.rent_amount || 0, renter.frequency)
    : 0;

  // Base salary for commission stylists
  const weeklyBaseSalary = renter?.payment_model === "commission" && renter?.base_salary
    ? (renter.base_salary_frequency === "monthly" ? renter.base_salary / (52 / 12) : renter.base_salary)
    : 0;

  const netPay = renter?.payment_model === "rent"
    ? weekGross - weeklyRent + weekTips
    : weekEarnings + weeklyBaseSalary + weekTips;

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

  const heroLabel = renter.payment_model === "rent" ? t("thisWeekNetRevenue") : t("thisWeekEarnings");

  const heroSub = renter.payment_model === "rent"
    ? `${formatCurrency(weekGross)} ${t("gross")} − ${formatCurrency(weeklyRent)} ${t("rent")}${weekTips > 0 ? ` + ${formatCurrency(weekTips)} ${t("tips")}` : ""}`
    : `${formatCurrency(weekEarnings)} ${t("commission")}${weeklyBaseSalary > 0 ? ` + ${formatCurrency(weeklyBaseSalary)} base` : ""}${weekTips > 0 ? ` + ${formatCurrency(weekTips)} ${t("tips")}` : ""}`;

  const kpiThird = renter.payment_model === "rent"
    ? { label: t("weeklyRentDeduction"), value: formatCurrency(weeklyRent) }
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label={t("services")} value={weekServices.length} icon={Scissors} />
          <KpiCard label={t("revenue")} value={formatCurrency(weekGross)} icon={TrendingUp} />
          <KpiCard label={kpiThird.label} value={kpiThird.value} icon={DollarSign} />
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
                      {renter.payment_model === "commission" && <p className="text-[10px] text-muted-foreground">{t("of")} {formatCurrency(s.amount)}</p>}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("earningsThisWeek")}</p>
                  <p className="font-serif text-lg font-medium mt-1 text-foreground">{t("dailyBreakdown")}</p>
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
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5 }} activeDot={{ r: 7 }} name={t("yourEarnings")} isAnimationActive={true} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pay Rent Button (rent model only) */}
        {renter.payment_model === "rent" && (
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-4 px-5 rounded-xl border border-primary/40 bg-primary/8 hover:bg-primary/15 transition-all flex items-center justify-between min-h-[60px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-primary">Pay Rent</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(weeklyRent)} due · Tap to pay</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/15 px-3 py-1.5 rounded-lg">Pay Now →</span>
          </button>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:flex md:gap-2 gap-2">
          <Link to="/paystub" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center">{t("paystub")}</Link>
          <Link to="/services" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center md:flex-1">{t("logService")}</Link>
          <Link to="/messages" className="py-3 px-4 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[44px] md:min-h-[52px] flex items-center justify-center md:flex-1">{t("messages")}</Link>
        </div>
      </div>

      {/* Pay Rent Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-light">Pay Rent</DialogTitle>
          </DialogHeader>
          <PaymentLinksPanel renter={renter} amount={weeklyRent} />
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}