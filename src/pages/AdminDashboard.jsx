import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, Users, DollarSign, Scissors } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import PullToRefresh from "@/components/PullToRefresh";

export default function AdminDashboard() {
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadData = useCallback(async () => {
    const [r, s, p] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.ServiceEntry.list(),
      base44.entities.Payment.list(),
    ]);
    setRenters(r); setServices(s); setPayments(p); setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const activeRenters = renters.filter(r => r.status === "active");
  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];

  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const weekRevenue = weekServices.reduce((sum, s) => sum + (s.amount || 0), 0);
  const weekOwnerEarnings = weekServices.reduce((sum, s) => sum + (s.owner_earnings || 0), 0);
  const weekPaidRent = payments.filter(p => p.status === "paid" && p.period >= wsStr && p.period <= weStr).reduce((s, p) => s + (p.amount || 0), 0);

  // Per-stylist breakdown
  const stylistRows = activeRenters.map(r => {
    const rServices = weekServices.filter(s => s.renter_id === r.id);
    const gross = rServices.reduce((s, e) => s + (e.amount || 0), 0);
    const ownerCut = rServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);
    const stylistCut = rServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
    return { ...r, gross, ownerCut, stylistCut, serviceCount: rServices.length };
  }).filter(r => r.gross > 0);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Overview</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeRenters.length} active stylists</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Week Revenue" value={formatCurrency(weekRevenue)} icon={TrendingUp} accent />
          <KpiCard label="Owner Earnings" value={formatCurrency(weekOwnerEarnings + weekPaidRent)} icon={DollarSign} />
          <KpiCard label="Services" value={weekServices.length} icon={Scissors} />
          <KpiCard label="Active Stylists" value={activeRenters.length} icon={Users} />
        </div>

        {/* Weekly commission breakdown */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-serif text-base font-medium">Commission Splits</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground font-medium min-w-[130px] text-center">{formatDateRange(ws)}</span>
              <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {stylistRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services this week.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stylist</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Services</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gross</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner Cut</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stylist Cut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stylistRows.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.serviceCount}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.gross)}</td>
                      <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(r.ownerCut)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.stylistCut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}