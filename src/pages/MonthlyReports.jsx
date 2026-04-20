import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekStart, getWeekEnd } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

function getWeeksInMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let d = getWeekStart(firstDay);
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

  const allMonths = [...new Set([
    ...services.map(s => s.service_date?.slice(0, 7)),
    ...payments.map(p => p.period?.slice(0, 7)),
    ...expenses.map(e => e.expense_date?.slice(0, 7)),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const toggle = (m) => setExpanded(p => ({ ...p, [m]: !p[m] }));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Analytics</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">Monthly Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rent income, commission earnings, and expenses by month</p>
        </div>

        {allMonths.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-16">No data yet. Start logging services and payments.</p>
        )}

        <div className="space-y-3">
          {allMonths.map(m => {
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

            const weeks = getWeeksInMonth(yr, mo);
            const weekRows = weeks.map(ws => {
              const we = getWeekEnd(ws);
              const wsStr = ws.toISOString().split("T")[0];
              const weStr = we.toISOString().split("T")[0];
              const wRent = payments.filter(p => p.status === "paid" && p.period >= wsStr && p.period <= weStr).reduce((s, p) => s + (p.amount || 0), 0);
              const wComm = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr).reduce((s, e) => s + (e.owner_earnings || 0), 0);
              const wExp = expenses.filter(e => e.expense_date >= wsStr && e.expense_date <= weStr).reduce((s, e) => s + (e.amount || 0), 0);
              return { wsStr, wRent, wComm, wExp, wNet: wRent + wComm - wExp };
            });

            return (
              <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors" onClick={() => toggle(m)}>
                  <p className="font-serif text-lg font-medium">{label}</p>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border divide-x divide-border">
                      {[
                        { label: "Rent Collected", value: formatCurrency(totalRent), color: "text-foreground", sub: "rent model" },
                        { label: "Commission Earned", value: formatCurrency(totalCommission), color: "text-primary", sub: "commission model" },
                        { label: "Expenses", value: `−${formatCurrency(totalExpenses)}`, color: "text-destructive", sub: "total" },
                        { label: "Net Profit", value: formatCurrency(netProfit), color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive", sub: "rent + commission − expenses" },
                      ].map(stat => (
                        <div key={stat.label} className="px-4 py-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                          <p className={`font-mono font-semibold text-sm ${stat.color}`}>{stat.value}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Weekly breakdown */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20 border-b border-border">
                            {["Week of", "Rent", "Commission", "Expenses", "Net"].map(h => (
                              <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Week of" ? "text-left pl-5" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {weekRows.map(row => (
                            <tr key={row.wsStr} className="hover:bg-muted/20">
                              <td className="pl-5 pr-4 py-2.5 text-muted-foreground">
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
                          <tr className="bg-muted/20 border-t border-border font-semibold">
                            <td className="pl-5 pr-4 py-2.5 text-xs">Totals</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(totalRent)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-primary text-xs">{formatCurrency(totalCommission)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-destructive text-xs">−{formatCurrency(totalExpenses)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                              {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                            </td>
                          </tr>
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