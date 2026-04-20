import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, toWeekly, freqMultiplier, categoryBadge, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, DollarSign, Users, Scissors, TrendingUp, CheckCircle2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import SplitBar from "@/components/ui/SplitBar.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import PullToRefresh from "@/components/PullToRefresh";

export default function AdminDashboard() {
  const [renters, setRenters] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [markingId, setMarkingId] = useState(null);

  const loadData = useCallback(async () => {
    const [r, s, p, te] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.ServiceEntry.list("-service_date", 100),
      base44.entities.Payment.list("-period"),
      base44.entities.TimeEntry.list("-clock_in", 200),
    ]);
    setRenters(r); setServices(s); setPayments(p); setTimeEntries(te); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const activeRenters = renters.filter(r => r.status === "active");
  const rentRenters = activeRenters.filter(r => r.payment_model === "rent");
  const commissionRenters = activeRenters.filter(r => r.payment_model === "commission");
  const hourlyRenters = activeRenters.filter(r => r.payment_model === "hourly");

  // KPIs
  const monthlyRentProjected = rentRenters.reduce((s, r) => s + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0);
  const collectedThisMonth = payments.filter(p => p.status === "paid" && p.period?.startsWith(currentMonthStr)).reduce((s, p) => s + (p.amount || 0), 0);

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
  const rentRows = rentRenters.map(r => {
    const weeklyAmt = toWeekly(r.rent_amount || 0, r.frequency);
    const paid = payments.find(p => p.renter_id === r.id && p.period === wsStr && p.status === "paid");
    const status = paid ? "paid" : (now.getDate() > 5 ? "overdue" : "pending");
    return { ...r, weeklyAmt, paid: !!paid, status };
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

  // Hourly payroll this week
  const weekTimeEntries = timeEntries.filter(e => {
    const d = e.clock_in?.split("T")[0];
    return d >= wsStr && d <= weStr;
  });
  const hourlyRows = hourlyRenters.map((r, i) => {
    const entries = weekTimeEntries.filter(e => e.renter_id === r.id);
    const totalHours = entries.reduce((s, e) => s + (e.total_hours || 0), 0);
    const grossPay = totalHours * (r.hourly_wage || 0);
    const weeklyDeduction = toWeekly(r.rent_amount || 0, r.frequency);
    const netPay = grossPay - weeklyDeduction;
    const clockedIn = entries.some(e => e.clock_in && !e.clock_out);
    return { ...r, totalHours, grossPay, weeklyDeduction, netPay, clockedIn, avatarIndex: i };
  });

  // Recent services (last 5)
  const recentServices = services.slice(0, 5);
  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Admin Dashboard</p>
          <h1 className="font-serif text-3xl md:text-4xl font-light tracking-wide">{greeting} ✦</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Monthly Rent" value={formatCurrency(monthlyRentProjected)} icon={DollarSign} accent glow sub="projected · rent model" />
          <KpiCard label="Collected" value={formatCurrency(collectedThisMonth)} icon={TrendingUp} sub="this month" />
          <KpiCard label="Our Commission" value={formatCurrency(weekOwnerCommission)} icon={Scissors} sub="this week · commission" />
          <KpiCard label="Active Stylists" value={activeRenters.length} icon={Users} sub={`${rentRenters.length} rent · ${commissionRenters.length} comm · ${hourlyRenters.length} hourly`} />
        </div>

        {/* Commission Splits */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-2 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Commission Splits</p>
              <p className="font-serif text-base font-medium mt-0.5">Week of {ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground min-w-[130px] text-center">{formatDateRange(ws)}</span>
              <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {commissionRenters.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No commission-model stylists yet.</p>
              <Link to="/renters" className="text-xs text-primary hover:underline">Add a stylist →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Stylist", "Services", "Total Earned", "Their Cut", "Our Cut ✦", "Split"].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Stylist" ? "text-left pl-5" : "text-right last:text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commRows.map(r => {
                    const av = getAvatarColor(r.avatarIndex);
                    return (
                      <tr key={r.id} className={cn("hover:bg-muted/20 transition-colors", r.gross === 0 && "opacity-50")}>
                        <td className="pl-5 pr-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
                              {getInitials(r.name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{r.name}</p>
                              <p className="text-xs text-muted-foreground">{r.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.rs.length}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(r.gross)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                          <span className="text-xs text-muted-foreground mr-1">{100 - (r.commission_owner || 40)}%</span>
                          {formatCurrency(r.stylistCut)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-primary font-semibold">
                          <span className="text-xs mr-1">{r.commission_owner || 40}%</span>
                          {formatCurrency(r.ownerCut)}
                        </td>
                        <td className="px-4 py-3 w-28">
                          <SplitBar ownerPct={r.commission_owner || 40} />
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals */}
                  <tr className="bg-muted/30 border-t border-border font-semibold">
                    <td className="pl-5 pr-4 py-3 text-sm">Totals</td>
                    <td className="px-4 py-3 text-right">{commRows.reduce((s, r) => s + r.rs.length, 0)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(commRows.reduce((s, r) => s + r.gross, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(commRows.reduce((s, r) => s + r.stylistCut, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(commRows.reduce((s, r) => s + r.ownerCut, 0))}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hourly Payroll */}
        {hourlyRenters.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Hourly Payroll</p>
              <p className="font-serif text-base font-medium mt-0.5">This Week · Hourly Stylists</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Stylist", "Status", "Hours", "Rate", "Gross", "Deduction", "Net"].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Stylist" ? "text-left pl-5" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hourlyRows.map(r => {
                    const av = getAvatarColor(r.avatarIndex);
                    return (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="pl-5 pr-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
                              {getInitials(r.name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{r.name}</p>
                              <p className="text-xs text-muted-foreground">{r.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", r.clockedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                            <span className="text-xs text-muted-foreground">{r.clockedIn ? "In" : "Out"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{r.totalHours.toFixed(2)}h</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(r.hourly_wage)}/hr</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.grossPay)}</td>
                        <td className="px-4 py-3 text-right font-mono text-destructive text-xs">−{formatCurrency(r.weeklyDeduction)}</td>
                        <td className={cn("px-4 py-3 text-right font-mono font-semibold", r.netPay >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          {formatCurrency(r.netPay)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rent Due */}
        {rentRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Rent Due</p>
              <p className="font-serif text-base font-medium mt-0.5">This Week · Rent Stylists</p>
            </div>
            <div className="divide-y divide-border">
              {rentRows.map(r => (
                <div key={r.id} className={cn("flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 gap-3 flex-wrap", r.status === "overdue" && "border-l-2 border-l-red-500")}>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.role}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{formatCurrency(r.weeklyAmt)}</span>
                    <StatusBadge status={r.status} />
                    {!r.paid && (
                      <GoldButton size="sm" onClick={() => markPaid(r)} disabled={markingId === r.id}>
                        {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Mark Paid
                      </GoldButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Services */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Recent Activity</p>
              <p className="font-serif text-base font-medium mt-0.5">Recent Services</p>
            </div>
            <Link to="/services" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {recentServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No services logged yet. <Link to="/services" className="text-primary hover:underline">Log one →</Link></p>
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
                      <p className="text-[10px] text-muted-foreground">ours: {formatCurrency(s.owner_earnings)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">Quick Access</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Payments", to: "/payments" }, { label: "Services", to: "/services" },
              { label: "Stylists", to: "/renters" }, { label: "Reports", to: "/reports" },
              { label: "Expenses", to: "/expenses" }, { label: "Messages", to: "/messages" },
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