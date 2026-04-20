import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, Scissors, DollarSign, TrendingUp, Link as LinkIcon } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { Link } from "react-router-dom";

export default function RenterDashboard() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, allServices] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.ServiceEntry.list("-service_date", 100),
    ]);
    const r = renters[0] || null;
    setRenter(r);
    if (r) setServices(allServices.filter(s => s.renter_id === r.id));
    setLoading(false);
  }, [user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const ws = getWeekStart();
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);

  const weekGross = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const weekEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const weeklyRent = renter?.payment_model === "rent" ? toWeekly(renter.rent_amount || 0, renter.frequency) : 0;
  const netPay = renter?.payment_model === "rent" ? weekGross - weeklyRent : weekEarnings;

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!renter) return (
    <div className="text-center py-20 space-y-3">
      <p className="font-serif text-2xl font-light">Hi {user?.full_name?.split(" ")[0] || "there"} ✦</p>
      <p className="text-muted-foreground">Your account isn't linked to a stylist profile yet.</p>
      <p className="text-sm text-muted-foreground">Contact the salon owner to get linked up.</p>
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-light tracking-wide">Hi {user?.full_name?.split(" ")[0] || "there"} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        {/* Hero earnings card */}
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {renter.payment_model === "rent" ? "This Week's Net Revenue" : "This Week's Earnings"}
          </p>
          <p className="font-mono text-4xl font-semibold tracking-tight">{formatCurrency(netPay)}</p>
          {renter.payment_model === "rent" && (
            <p className="text-xs text-muted-foreground">{formatCurrency(weekGross)} gross − {formatCurrency(weeklyRent)} rent</p>
          )}
          {renter.payment_model === "commission" && (
            <p className="text-xs text-muted-foreground">Your {100 - (renter.commission_owner || 40)}% of {formatCurrency(weekGross)} total</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Services" value={weekServices.length} icon={Scissors} />
          <KpiCard label="Revenue" value={formatCurrency(weekGross)} icon={TrendingUp} />
          <KpiCard label={renter.payment_model === "rent" ? "Weekly Rent" : "Your Rate"} value={renter.payment_model === "rent" ? formatCurrency(weeklyRent) : `${100 - (renter.commission_owner || 40)}%`} icon={DollarSign} />
        </div>

        {/* This week's services */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-base font-medium">This Week's Services</h2>
            <p className="text-xs text-muted-foreground">{formatDateRange(ws)}</p>
          </div>
          {weekServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services logged this week.</p>
          ) : (
            <div className="divide-y divide-border">
              {weekServices.map(s => {
                const cat = categoryBadge(s.category);
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", cat.className)}>{cat.label}</span>
                      <div>
                        <p className="text-sm font-medium">{s.description || "Service"}</p>
                        <p className="text-xs text-muted-foreground">{s.client_name || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">{formatCurrency(s.renter_earnings)}</p>
                      {renter.payment_model === "commission" && <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="flex gap-2">
          <Link to="/paystub" className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors">Paystub</Link>
          <Link to="/services" className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted/50 transition-colors">Log a Service</Link>
        </div>
      </div>
    </PullToRefresh>
  );
}