import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { freqMultiplier, formatCurrency } from "@/lib/utils";
import { DollarSign, Users, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PullToRefresh from "../components/PullToRefresh";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [renters, setRenters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const currency = "$";

  const loadData = useCallback(async () => {
    const [r, p, t] = await Promise.all([
    base44.entities.Renter.list(),
    base44.entities.Payment.list(),
    base44.entities.TimeEntry.list()]
    );
    setRenters(r);
    setPayments(p);
    setTimeEntries(t);
    setLoading(false);
  }, []);

  useEffect(() => {loadData();}, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>);


  const activeRenters = renters.filter((r) => r.status === "active");
  const totalMonthly = activeRenters.reduce((s, r) => s + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const paidThisMonth = payments.filter((p) => p.period === currentMonth && p.status === "paid").
  reduce((s, p) => s + (p.amount || 0), 0);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const totalHoursThisWeek = timeEntries.
  filter((t) => t.clock_in && new Date(t.clock_in) >= thisWeekStart).
  reduce((s, t) => s + (t.total_hours || 0), 0);

  const stats = [
  { label: "Monthly Rent Revenue", value: formatCurrency(totalMonthly, currency), icon: DollarSign, color: "text-primary", bg: "bg-primary/10", sub: "projected" },
  { label: "Collected This Month", value: formatCurrency(paidThisMonth, currency), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", sub: "payments received" },
  { label: "Active Renters", value: activeRenters.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", sub: "stations occupied" },
  { label: "Hours Logged This Week", value: totalHoursThisWeek.toFixed(1) + "h", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", sub: "across all renters" }];


  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full shop overview — {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{s.label}</span>
                  

                  
                </div>
                <p className={`text-xl sm:text-2xl font-semibold font-mono tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
              </div>);

          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Renters Summary */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">Renter Payroll Summary</h3>
              <Link to="/master-ledger" className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-border">
              {activeRenters.slice(0, 5).map((r) => {
                const hours = timeEntries.
                filter((t) => t.renter_id === r.id && t.clock_in && new Date(t.clock_in) >= thisWeekStart).
                reduce((s, t) => s + (t.total_hours || 0), 0);
                const gross = hours * (r.hourly_wage || 0);
                const weeklyRent = (r.rent_amount || 0) * freqMultiplier(r.frequency) / 4.33;
                const net = gross - weeklyRent;
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{hours.toFixed(1)}h @ {formatCurrency(r.hourly_wage || 0, currency)}/hr</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{net >= 0 ? "net pay" : "balance due"}</p>
                    </div>
                  </div>);

              })}
              {activeRenters.length === 0 &&
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">No active renters yet.</p>
              }
            </div>
          </div>

          {/* Quick Links */}
          
















          
        </div>
      </div>
    </PullToRefresh>);

}