import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, toWeekly, freqMultiplier } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, Users, DollarSign, Scissors, CheckCircle2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import PullToRefresh from "@/components/PullToRefresh";

export default function AdminDashboard() {
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [markingId, setMarkingId] = useState(null);

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

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const activeRenters = renters.filter(r => r.status === "active");
  const rentModelRenters = activeRenters.filter(r => r.payment_model === "rent");
  const commissionRenters = activeRenters.filter(r => r.payment_model === "commission");

  // KPIs
  const monthlyRentProjected = rentModelRenters.reduce((s, r) => s + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0);
  const collectedThisMonth = payments.filter(p => p.status === "paid" && p.period?.startsWith(currentMonthStr)).reduce((s, p) => s + (p.amount || 0), 0);

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];

  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);
  const weekCommission = weekServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);

  // Commission splits (commission model only)
  const commissionRows = commissionRenters.map(r => {
    const rs = weekServices.filter(s => s.renter_id === r.id);
    const gross = rs.reduce((s, e) => s + (e.amount || 0), 0);
    const ownerCut = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
    const stylistCut = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
    return { ...r, serviceCount: rs.length, gross, ownerCut, stylistCut };
  }).filter(r => r.gross > 0);

  // Rent due this week
  const rentRows = rentModelRenters.map(r => {
    const weeklyAmt = toWeekly(r.rent_amount || 0, r.frequency);
    const paid = payments.find(p => p.renter_id === r.id && p.period === wsStr && p.status === "paid");
    const overdue = !paid && now.getDate() > 5;
    return { ...r, weeklyAmt, paid: !!paid, paymentId: paid?.id, status: paid ? "paid" : overdue ? "overdue" : "pending" };
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

  const quickLinks = [
    { label: "Payments", to: "/payments" }, { label: "Services", to: "/services" },
    { label: "Stylists & Payroll", to: "/renters" }, { label: "Monthly Reports", to: "/reports" },
    { label: "Expenses", to: "/expenses" }, { label: "Messages", to: "/messages" },
  ];

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-light tracking-wide">{greeting} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Monthly Rent" value={formatCurrency(monthlyRentProjected)} icon={DollarSign} accent sub="projected" />
          <KpiCard label="Collected This Month" value={formatCurrency(collectedThisMonth)} icon={TrendingUp} />
          <KpiCard label="Our Commission" value={formatCurrency(weekCommission)} icon={Scissors} sub="this week" />
          <KpiCard label="Active Stylists" value={activeRenters.length} icon={Users} />
        </div>

        {/* Commission Splits */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="font-serif text-base font-medium">Weekly Commission Splits</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Commission-model stylists only</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground font-medium min-w-[145px] text-center">{formatDateRange(ws)}</span>
              <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {commissionRenters.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No commission-model stylists yet.</p>
              <Link to="/renters" className="text-xs text-primary hover:underline mt-1 inline-block">Add a stylist →</Link>
            </div>
          ) : commissionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services logged this week for commission stylists.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    {["Stylist","Services","Gross","Split","Their Earnings","Our Earnings"].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Stylist" ? "text-left pl-5" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commissionRows.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="pl-5 pr-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.role}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.serviceCount}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.gross)}</td>
                      <td className="px-4 py-3">
                        <SplitBar ownerPct={r.commission_owner || 40} />
                        <p className="text-[10px] text-muted-foreground mt-1 text-center">{r.commission_owner}% / {100-(r.commission_owner||40)}%</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.stylistCut)}</td>
                      <td className="px-4 py-3 text-right font-mono text-primary font-semibold">{formatCurrency(r.ownerCut)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20 border-t border-border font-semibold">
                    <td className="pl-5 pr-4 py-3 text-sm">Totals</td>
                    <td className="px-4 py-3 text-right">{commissionRows.reduce((s,r)=>s+r.serviceCount,0)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRows.reduce((s,r)=>s+r.gross,0))}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(commissionRows.reduce((s,r)=>s+r.stylistCut,0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(commissionRows.reduce((s,r)=>s+r.ownerCut,0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rent Due This Week */}
        {rentRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base font-medium">Rent Due This Week</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Rent-model stylists only</p>
            </div>
            <div className="divide-y divide-border">
              {rentRows.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">{formatCurrency(r.weeklyAmt)}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      r.status === "paid" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                      r.status === "overdue" ? "bg-red-500/15 text-red-500 border-red-500/30" :
                      "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    }`}>{r.status}</span>
                    {!r.paid && (
                      <GoldButton size="sm" onClick={() => markPaid(r)} disabled={markingId === r.id}>
                        {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Paid
                      </GoldButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">Quick Access</p>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map(l => (
              <Link key={l.to} to={l.to} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}