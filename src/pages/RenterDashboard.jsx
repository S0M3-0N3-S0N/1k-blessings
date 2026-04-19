import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge } from "@/lib/utils";
import { Loader2, Scissors, DollarSign, TrendingUp } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import PullToRefresh from "@/components/PullToRefresh";
import { cn } from "@/lib/utils";

export default function RenterDashboard() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, allServices] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.ServiceEntry.list("-service_date", 50),
    ]);
    const r = renters[0] || null;
    setRenter(r);
    if (r) setServices(allServices.filter(s => s.renter_id === r.id));
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const ws = getWeekStart();
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const weekGross = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const weekEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const totalEarnings = services.reduce((s, e) => s + (e.renter_earnings || 0), 0);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Welcome back</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{user?.full_name?.split(" ")[0] || "Stylist"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDateRange(ws)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="This Week Gross" value={formatCurrency(weekGross)} icon={TrendingUp} accent />
          <KpiCard label="My Earnings" value={formatCurrency(weekEarnings)} icon={DollarSign} />
          <KpiCard label="Services" value={weekServices.length} icon={Scissors} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-base font-medium">This Week's Services</h2>
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
                      <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}