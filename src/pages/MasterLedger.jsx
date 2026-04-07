import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, freqMultiplier, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function MasterLedger() {
  const [renters, setRenters] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [charges, setCharges] = useState([]);
  const [serviceEntries, setServiceEntries] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const currency = "$";

  useEffect(() => {
    Promise.all([
    base44.entities.Renter.list(),
    base44.entities.TimeEntry.list(),
    base44.entities.Charge.list(),
    base44.entities.ServiceEntry.list()]
    ).then(([r, t, c, s]) => {
      setRenters(r);
      setTimeEntries(t);
      setCharges(c);
      setServiceEntries(s);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>);


  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const activeRenters = renters.filter((r) => r.status === "active");

  const rows = activeRenters.map((r, i) => {
    const entries = timeEntries.filter((t) => t.renter_id === r.id && t.clock_in && new Date(t.clock_in) >= weekStart && new Date(t.clock_in) < weekEnd);
    const hours = entries.reduce((s, t) => s + (t.total_hours || 0), 0);
    const gross = hours * (r.hourly_wage || 0);
    const weeklyRent = (r.rent_amount || 0) * freqMultiplier(r.frequency) / 4.33;
    const renterCharges = charges.filter((c) => c.renter_id === r.id).reduce((s, c) => s + (c.amount || 0) * freqMultiplier(c.frequency) / 4.33, 0);
    const serviceEarnings = serviceEntries.
    filter((se) => se.renter_id === r.id && se.service_date >= weekStart.toISOString().split('T')[0] && se.service_date < weekEnd.toISOString().split('T')[0]).
    reduce((s, se) => s + (se.renter_earnings || 0), 0);
    const totalDeductions = weeklyRent + renterCharges;
    const net = gross + serviceEarnings - totalDeductions;
    const avatar = getAvatarColor(i);
    return { renter: r, hours, gross, weeklyRent, renterCharges, serviceEarnings, totalDeductions, net, avatar };
  });

  const totals = rows.reduce((acc, r) => ({
    hours: acc.hours + r.hours,
    gross: acc.gross + r.gross,
    deductions: acc.deductions + r.totalDeductions,
    net: acc.net + r.net
  }), { hours: 0, gross: 0, deductions: 0, net: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full payroll view for all renters</p>
        </div>
        <Select value={String(weekOffset)} onValueChange={(v) => setWeekOffset(Number(v))}>
          <SelectTrigger className="h-9 text-xs w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">This Week</SelectItem>
            <SelectItem value="1">Last Week</SelectItem>
            <SelectItem value="2">2 Weeks Ago</SelectItem>
            <SelectItem value="3">3 Weeks Ago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Wage</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gross Pay</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Rent</th>
              
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Services</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 &&
            <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground text-sm">No active renters.</td></tr>
            }
            {rows.map(({ renter, hours, gross, weeklyRent, renterCharges, serviceEarnings, net, avatar }) =>
            <tr key={renter.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", avatar.bg, avatar.text)}>
                      {getInitials(renter.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{renter.name}</p>
                      <p className="text-[11px] text-muted-foreground">{renter.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono">{hours.toFixed(1)}h</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatCurrency(renter.hourly_wage || 0, currency)}/hr</td>
                <td className="px-3 py-3 text-right font-mono font-medium">{formatCurrency(gross, currency)}</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">-{formatCurrency(weeklyRent, currency)}</td>
                
                <td className="px-3 py-3 text-right font-mono text-emerald-600 hidden md:table-cell">+{formatCurrency(serviceEarnings, currency)}</td>
                <td className="px-3 py-3 text-right">
                  <span className={cn("font-mono font-bold text-sm", net >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{net >= 0 ? "net pay" : "balance due"}</p>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 border-t border-border">
              <td className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Totals</td>
              <td className="px-3 py-3 text-right font-mono font-bold">{totals.hours.toFixed(1)}h</td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totals.gross, currency)}</td>
              <td className="px-3 py-3 text-right font-mono font-bold hidden md:table-cell text-red-500">-{formatCurrency(totals.deductions, currency)}</td>
              <td className="px-3 py-3 hidden md:table-cell"></td>
              <td className={cn("px-3 py-3 text-right font-mono font-bold text-base", totals.net >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatCurrency(totals.net, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>);

}