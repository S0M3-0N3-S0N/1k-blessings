import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, freqMultiplier, cn } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Paystub() {
  const { user } = useAuth();
  const [renter, setRenter] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [charges, setCharges] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const currency = "$";

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.TimeEntry.list(),
      base44.entities.Charge.list(),
    ]).then(([renters, entries, ch]) => {
      const r = renters[0] || null;
      setRenter(r);
      if (r) {
        setTimeEntries(entries.filter(e => e.renter_id === r.id));
        setCharges(ch.filter(c => c.renter_id === r.id));
      }
      setLoading(false);
    });
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!renter) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
      <AlertCircle className="w-10 h-10 text-muted-foreground" />
      <p className="font-semibold">No renter profile linked to your account.</p>
    </div>
  );

  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekEntries = timeEntries.filter(t => t.clock_in && new Date(t.clock_in) >= weekStart && new Date(t.clock_in) < weekEnd);
  const totalHours = weekEntries.reduce((s, t) => s + (t.total_hours || 0), 0);
  const grossPay = totalHours * (renter.hourly_wage || 0);
  const weeklyRent = (renter.rent_amount || 0) * freqMultiplier(renter.frequency) / 4.33;
  const extraCharges = charges.reduce((s, c) => s + (c.amount || 0) * freqMultiplier(c.frequency) / 4.33, 0);
  const totalDeductions = weeklyRent + extraCharges;
  const netPay = grossPay - totalDeductions;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paystub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{renter.name}</p>
        </div>
        <Select value={String(weekOffset)} onValueChange={v => setWeekOffset(Number(v))}>
          <SelectTrigger className="h-9 text-xs w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">This Week</SelectItem>
            <SelectItem value="1">Last Week</SelectItem>
            <SelectItem value="2">2 Weeks Ago</SelectItem>
            <SelectItem value="3">3 Weeks Ago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>

      {/* Hours Breakdown */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <div className="px-5 py-3 bg-muted/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours Worked</p>
        </div>
        {weekEntries.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground text-center">No hours logged this week.</div>
        ) : weekEntries.map((entry, i) => {
          const clockIn = new Date(entry.clock_in);
          const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
          return (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{clockIn.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">
                  {clockIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {clockOut ? ` – ${clockOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : " (clocked in)"}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold">{(entry.total_hours || 0).toFixed(2)}h</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
          <span className="text-sm font-semibold">Total Hours</span>
          <span className="font-mono font-bold">{totalHours.toFixed(2)}h</span>
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <div className="px-5 py-3 bg-muted/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings & Deductions</p>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">Gross Pay ({totalHours.toFixed(1)}h × {formatCurrency(renter.hourly_wage || 0, currency)}/hr)</span>
          <span className="font-mono font-semibold text-sm">{formatCurrency(grossPay, currency)}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">Booth Rent (weekly)</span>
          <span className="font-mono text-sm text-red-500">-{formatCurrency(weeklyRent, currency)}</span>
        </div>
        {extraCharges > 0 && (
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-muted-foreground">Supply Charges</span>
            <span className="font-mono text-sm text-red-500">-{formatCurrency(extraCharges, currency)}</span>
          </div>
        )}
        <div className={cn("flex items-center justify-between px-5 py-4", netPay >= 0 ? "bg-emerald-50" : "bg-red-50")}>
          <span className={cn("text-base font-bold", netPay >= 0 ? "text-emerald-700" : "text-red-600")}>
            {netPay >= 0 ? "Net Pay" : "Balance Due"}
          </span>
          <span className={cn("font-mono font-bold text-xl", netPay >= 0 ? "text-emerald-600" : "text-red-500")}>
            {formatCurrency(Math.abs(netPay), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}