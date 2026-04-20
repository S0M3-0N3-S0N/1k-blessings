import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, Scissors, DollarSign, TrendingUp } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function RenterDashboard() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, allServices] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.ServiceEntry.list("-service_date", 200),
    ]);
    const r = renters[0] || null;
    setRenter(r);
    if (r) setServices(allServices.filter(s => s.renter_id === r.id));
    setLoading(false);
  }, [user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const ws = getWeekStart();
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);

  const weekGross = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const weekEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const weekTips = weekServices.reduce((s, e) => s + (e.tip_amount || 0), 0);
  const weeklyRent = renter?.payment_model === "rent" ? toWeekly(renter.rent_amount || 0, renter.frequency) : 0;
  const netPay = renter?.payment_model === "rent" ? weekGross - weeklyRent : weekEarnings + weekTips;

  // Chart data — last 4 weeks or daily this week
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
      <p className="text-muted-foreground text-sm">Your account isn't linked to a stylist profile yet.</p>
      <p className="text-xs text-muted-foreground">Contact the salon owner to get connected.</p>
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">My Studio</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">Hi {user?.full_name?.split(" ")[0] || "there"} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        {/* Hero */}
        <div className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden shadow-[0_0_30px_rgba(201,152,74,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary relative">
            {renter.payment_model === "rent" ? "This Week's Net Revenue" : "This Week's Total Earnings"}
          </p>
          <p className="font-mono text-5xl font-semibold tracking-tight mt-2 relative">{formatCurrency(netPay)}</p>
          <p className="text-xs text-muted-foreground mt-2 relative">
            {renter.payment_model === "rent"
              ? `${formatCurrency(weekGross)} gross − ${formatCurrency(weeklyRent)} rent`
              : `${formatCurrency(weekEarnings)} commission + ${formatCurrency(weekTips)} tips`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 relative">{formatDateRange(ws)}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Services" value={weekServices.length} icon={Scissors} />
          <KpiCard label="Revenue" value={formatCurrency(weekGross)} icon={TrendingUp} />
          <KpiCard label={renter.payment_model === "rent" ? "Weekly Rent" : "Your Rate"} value={renter.payment_model === "rent" ? formatCurrency(weeklyRent) : `${100 - (renter.commission_owner || 40)}%`} icon={DollarSign} />
        </div>

        {/* Services this week */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">This Week</p>
              <p className="font-serif text-base font-medium mt-0.5">My Services</p>
            </div>
            <Link to="/services" className="text-xs text-primary hover:underline">Log a Service →</Link>
          </div>
          {weekServices.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-muted-foreground">No services this week yet.</p>
              <Link to="/services" className="text-xs text-primary hover:underline">Log your first →</Link>
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
                  <p className="text-sm text-muted-foreground font-medium">Tips this week</p>
                  <p className="font-mono text-sm font-semibold text-primary">+{formatCurrency(weekTips)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-4">Earnings This Week</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Your Earnings" />
                {renter.payment_model === "commission" && <Bar dataKey="owner" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Owner's Cut" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex gap-2">
          <Link to="/paystub" className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[52px] flex items-center justify-center">Paystub</Link>
          <Link to="/services" className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[52px] flex items-center justify-center">Log a Service</Link>
          <Link to="/messages" className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors min-h-[52px] flex items-center justify-center">Messages</Link>
        </div>
      </div>
    </PullToRefresh>
  );
}