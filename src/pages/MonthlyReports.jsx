import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekStart, getWeekEnd } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

function getMonths(services, payments, expenses) {
  const allDates = [
    ...services.map(s => s.service_date),
    ...payments.map(p => p.period),
    ...expenses.map(e => e.expense_date),
  ].filter(Boolean).map(d => d.slice(0, 7));
  return [...new Set(allDates)].sort((a, b) => b.localeCompare(a));
}

function getWeeksInMonth(year, month) {
  const weeks = [];
  let d = getWeekStart(new Date(year, month - 1, 1));
  // Go back to the Monday on or before the 1st
  while (d.getMonth() !== month - 1 && d.getFullYear() !== year) d = new Date(d.getTime() + 7 * 86400000);
  const lastDay = new Date(year, month, 0);
  while (d <= lastDay) {
    weeks.push(new Date(d));
    d = new Date(d.getTime() + 7 * 86400000);
  }
  return weeks;
}

export default function MonthlyReports() {
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const loadData = useCallback(async () => {
    const [s, p, e] = await Promise.all([
      base44.entities.ServiceEntry.list(),
      base44.entities.Payment.list(),
      base44.entities.Expense.list(),
    ]);
    setServices(s); setPayments(p); setExpenses(e); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const months = getMonths(services, payments, expenses);
  const toggle = (m) => setExpanded(p => ({ ...p, [m]: !p[m] }));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Analytics</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">Monthly Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Income, commissions, and expenses by month</p>
        </div>

        {months.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-16">No data yet. Start logging services and payments.</p>
        )}

        <div className="space-y-3">
          {months.map(m => {
            const [yr, mo] = m.split("-").map(Number);
            const label = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

            const monthPayments = payments.filter(p => p.status === "paid" && p.period?.startsWith(m));
            const totalRent = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

            const monthServices = services.filter(s => s.service_date?.startsWith(m));
            const totalCommission = monthServices.reduce((s, e) => s + (e.owner_earnings || 0), 0);

            const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(m));
            const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

            const netProfit = totalRent + totalCommission - totalExpenses;
            const isOpen = expanded[m] !== false;

            // Weekly breakdown
            const weeks = getWeeksInMonth(yr, mo);
            const weekRows = weeks.map(ws => {
              const we = getWeekEnd(ws);
              const wsStr = ws.toISOString().split("T")[0];
              const weStr = we.toISOString().split("T")[0];
              const wRent = monthPayments.filter(p => p.period >= wsStr && p.period <= weStr).reduce((s, p) => s + (p.amount || 0), 0);
              const wComm = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr).reduce((s, e) => s + (e.owner_earnings || 0), 0);
              const wExp = expenses.filter(e => e.expense_date >= wsStr && e.expense_date <= weStr).reduce((s, e) => s + (e.amount || 0), 0);
              const wNet = wRent + wComm - wExp;
              return { wsStr, wRent, wComm, wExp, wNet };
            });

            return (
              <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
                  onClick={() => toggle(m)}>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-serif text-lg font-medium text-left">{label}</p>
                      <p className="text-xs text-muted-foreground text-left">{monthServices.length} services · {monthPayments.length} payments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-mono font-bold text-base ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">net profit</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border divide-x divide-border">
                      {[
                        { label: "Rent Collected", value: formatCurrency(totalRent), color: "text-foreground" },
                        { label: "Our Commission", value: formatCurrency(totalCommission), color: "text-primary" },
                        { label: "Expenses", value: `−${formatCurrency(totalExpenses)}`, color: "text-destructive" },
                        { label: "Net Profit", value: formatCurrency(netProfit), color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive" },
                      ].map(stat => (
                        <div key={stat.label} className="px-4 py-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                          <p className={`font-mono font-semibold text-sm ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Weekly breakdown */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20 border-b border-border">
                            <th className="px-5 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Week of</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rent</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Commission</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expenses</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {weekRows.map(row => (
                            <tr key={row.wsStr} className="hover:bg-muted/20">
                              <td className="px-5 py-2.5 text-muted-foreground">
                                {new Date(row.wsStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(row.wRent)}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-primary">{formatCurrency(row.wComm)}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-destructive">−{formatCurrency(row.wExp)}</td>
                              <td className={`px-4 py-2.5 text-right font-mono font-semibold ${row.wNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                                {row.wNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(row.wNet))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PullToRefresh>
  );
}