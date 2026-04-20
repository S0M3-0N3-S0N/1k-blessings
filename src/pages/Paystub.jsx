import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

const WEEK_LABELS = ["This Week", "Last Week", "2 Weeks Ago", "3 Weeks Ago"];

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
      const s = await base44.entities.ServiceEntry.list("-service_date", 300);
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
  const weeklyRent = renter?.payment_model === "rent" ? toWeekly(renter.rent_amount || 0, renter.frequency) : 0;
  const netPay = renter?.payment_model === "rent" ? grossRevenue - weeklyRent : myEarnings;

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!renter) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Your account is not linked to a stylist profile yet.</p>
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        {/* Header + week selector */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Earnings</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Paystub</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => Math.min(3, o + 1))} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 font-medium" value={weekOffset} onChange={e => setWeekOffset(Number(e.target.value))}>
              {WEEK_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
            <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Net pay hero */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">
            {renter.payment_model === "rent" ? "Net Pay" : "Total Commission Earned"}
          </p>
          <p className="font-mono text-4xl font-bold tracking-tight">{formatCurrency(netPay)}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatDateRange(ws)}</p>
        </div>

        {/* Service breakdown */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-base font-medium">Service Breakdown</h2>
          </div>
          {weekServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services this week.</p>
          ) : (
            <>
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
                        {renter.payment_model === "commission" ? (
                          <>
                            <p className="font-mono text-sm font-semibold text-primary">{formatCurrency(s.renter_earnings)}</p>
                            <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>
                          </>
                        ) : (
                          <p className="font-mono text-sm font-semibold">{formatCurrency(s.amount)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{renter.payment_model === "rent" ? "Total Service Revenue" : "Total Commission Earned"}</span>
                  <span className="font-mono font-semibold">{formatCurrency(renter.payment_model === "rent" ? grossRevenue : myEarnings)}</span>
                </div>
                {renter.payment_model === "rent" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weekly Rent</span>
                      <span className="font-mono text-destructive">−{formatCurrency(weeklyRent)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                      <span>Net Pay</span>
                      <span className={`font-mono ${netPay >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{formatCurrency(netPay)}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}