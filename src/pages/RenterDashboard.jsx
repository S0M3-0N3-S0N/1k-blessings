import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, freqMultiplier } from "@/lib/utils";
import ClockInOut from "../components/renter/ClockInOut";
import RentEarningsChart from "../components/renter/RentEarningsChart";
import { Loader2, TrendingUp, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function RenterDashboard() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const currency = "$";

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, entries] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.TimeEntry.list(),
    ]);
    const myRenter = renters[0] || null;
    setRenter(myRenter);
    if (myRenter) {
      setTimeEntries(entries.filter(e => e.renter_id === myRenter.id));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!renter) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-6">
      <AlertCircle className="w-10 h-10 text-muted-foreground" />
      <div>
        <p className="font-semibold">No renter profile linked</p>
        <p className="text-sm text-muted-foreground mt-1">Ask your admin to link your email to your renter profile.</p>
      </div>
    </div>
  );

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const weekEntries = timeEntries.filter(t => t.clock_in && new Date(t.clock_in) >= thisWeekStart);
  const totalHours = weekEntries.reduce((s, t) => s + (t.total_hours || 0), 0);
  const grossPay = totalHours * (renter.hourly_wage || 0);
  const weeklyRent = (renter.rent_amount || 0) * freqMultiplier(renter.frequency) / 4.33;
  const netPay = grossPay - weeklyRent;
  const isClocked = timeEntries.some(t => t.clock_in && !t.clock_out);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi, {renter.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {/* Net Pay Card */}
      <div className={`rounded-xl p-5 text-white ${netPay >= 0 ? "bg-emerald-500" : "bg-red-500"}`}>
        <p className="text-sm font-medium opacity-80">{netPay >= 0 ? "Net Pay This Week" : "Balance Due This Week"}</p>
        <p className="text-4xl font-bold font-mono mt-1">{formatCurrency(Math.abs(netPay), currency)}</p>
        <div className="flex gap-4 mt-3 text-sm opacity-80">
          <span>Gross: {formatCurrency(grossPay, currency)}</span>
          <span>Rent: -{formatCurrency(weeklyRent, currency)}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Hours This Week", value: totalHours.toFixed(1) + "h", icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Hourly Wage", value: formatCurrency(renter.hourly_wage || 0, currency), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          { label: "Gross Earnings", value: formatCurrency(grossPay, currency), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Clock In/Out */}
      <ClockInOut renter={renter} timeEntries={timeEntries} onUpdate={loadData} />

      {/* Rent vs Earnings Chart */}
      <RentEarningsChart grossPay={grossPay} weeklyRent={weeklyRent} currency={currency} />

      {/* Quick Link to Paystub */}
      <Link to="/paystub" className="flex items-center justify-between bg-card rounded-xl border border-border px-5 py-4 hover:bg-muted/30 transition-colors">
        <div>
          <p className="text-sm font-semibold">View Full Paystub</p>
          <p className="text-xs text-muted-foreground mt-0.5">Hours breakdown & deductions</p>
        </div>
        <span className="text-primary text-sm font-medium">→</span>
      </Link>
    </div>
  );
}