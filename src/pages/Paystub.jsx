import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import PullToRefresh from "@/components/PullToRefresh";

export default function Paystub() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const renters = await base44.entities.Renter.filter({ user_email: user.email });
    const r = renters[0] || null;
    setRenter(r);
    if (r) {
      const s = await base44.entities.ServiceEntry.list("-service_date", 200);
      setServices(s.filter(x => x.renter_id === r.id));
    }
    setLoading(false);
  }, [user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const grossRevenue = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const myEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const ownerEarnings = weekServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!renter) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Your account is not linked to a stylist profile yet.</p>
      <p className="text-sm text-muted-foreground mt-1">Please contact the salon owner.</p>
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Earnings</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Paystub</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium min-w-[130px] text-center">{formatDateRange(ws)}</span>
            <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="My Earnings" value={formatCurrency(myEarnings)} accent />
          <KpiCard label="Gross Revenue" value={formatCurrency(grossRevenue)} />
          <KpiCard label="Services" value={weekServices.length} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-serif text-base font-medium">Service Breakdown</h2>
            <span className="text-xs text-muted-foreground">{renter.commission_owner}% owner / {100 - (renter.commission_owner || 40)}% you</span>
          </div>
          {weekServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services this week.</p>
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
                        <p className="text-xs text-muted-foreground">{s.client_name || "—"} · {s.service_date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-primary">{formatCurrency(s.renter_earnings)}</p>
                      <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {weekServices.length > 0 && (
            <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-between items-center">
              <span className="text-sm font-semibold">Total Earnings</span>
              <span className="font-mono font-bold text-lg text-primary">{formatCurrency(myEarnings)}</span>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}