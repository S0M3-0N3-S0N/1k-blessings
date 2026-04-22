import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekStart, getWeekEnd, cn, freqLabel } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PullToRefresh from "@/components/PullToRefresh";

function getMondaysInMonth(year, month) {
  const mondays = [];
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month - 1) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

export default function MonthlyReports() {
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const loadData = useCallback(async () => {
    const [s, p, e, r] = await Promise.all([
      base44.entities.ServiceEntry.list(),
      base44.entities.Payment.list(),
      base44.entities.Expense.list(),
      base44.entities.Renter.list(),
    ]);
    setServices(s); setPayments(p); setExpenses(e); setRenters(r); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const allMonths = [...new Set([
    ...services.map(s => s.service_date?.slice(0, 7)),
    ...payments.map(p => p.period?.slice(0, 7)),
    ...expenses.map(e => e.expense_date?.slice(0, 7)),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const toggle = (m) => setExpanded(p => ({ ...p, [m]: !p[m] }));

  const getMonthData = (m) => {
    const [yr, mo] = m.split("-").map(Number);
    const monthPmts = payments.filter(p => p.status === "paid" && p.period?.startsWith(m));
    const monthSvcs = services.filter(s => s.service_date?.startsWith(m));
    const monthExp = expenses.filter(e => e.expense_date?.startsWith(m));
    const rentIncome = monthPmts.reduce((s, p) => s + (p.amount || 0), 0);
    const commissionIncome = monthSvcs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
    const totalIncome = rentIncome + commissionIncome;
    const totalExpenses = monthExp.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    return { rentIncome, commissionIncome, totalIncome, totalExpenses, netProfit, monthSvcs, monthPmts, monthExp, yr, mo };
  };

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("reports")}</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{t("reports")}</h1>
        </div>

        {allMonths.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">{t("noDataYet") || "No data yet. Start logging services and payments."}</p>
          </div>
        )}

        {/* Payroll History */}
        <PayrollHistory renters={renters} services={services} />

        <div className="space-y-3">
          {allMonths.map((m, idx) => {
            const data = getMonthData(m);
            const { rentIncome, commissionIncome, totalIncome, totalExpenses, netProfit, monthSvcs, monthPmts, monthExp, yr, mo } = data;
            const label = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const isOpen = expanded[m] !== false && idx === 0 ? true : !!expanded[m];

            // Trend vs prior month
            const prevM = allMonths[idx + 1];
            const prevData = prevM ? getMonthData(prevM) : null;
            const trendPct = prevData && prevData.netProfit !== 0
              ? Math.round(((netProfit - prevData.netProfit) / Math.abs(prevData.netProfit)) * 100)
              : null;

            const mondays = getMondaysInMonth(yr, mo);

            return (
              <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors min-h-[64px]" onClick={() => toggle(m)}>
                  <p className="font-serif text-lg font-medium">{label}</p>
                  <div className="flex items-center gap-3">
                    {trendPct !== null && (
                      <div className={cn("flex items-center gap-1 text-xs font-medium", trendPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                        {trendPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trendPct)}% {t("vsPrior") || "vs prior"}
                      </div>
                    )}
                    <div className="text-right">
                      <p className={cn("font-mono font-bold text-lg", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                        {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t("netProfit") || "net profit"}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {/* Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border">
                      {[
                        { label: t("rentalIncome") || "Rental Income", value: formatCurrency(rentIncome), note: t("rent") },
                        { label: t("commissionIncome") || "Commission Income", value: formatCurrency(commissionIncome), note: t("commission"), gold: true },
                        { label: t("expenses"), value: `−${formatCurrency(totalExpenses)}`, red: true },
                        { label: t("netProfit") || "Net Profit", value: `${netProfit >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netProfit))}`, green: netProfit >= 0, red2: netProfit < 0 },
                      ].map(stat => (
                        <div key={stat.label} className="px-4 py-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                          <p className={cn("font-mono font-semibold text-sm", stat.gold && "text-primary", stat.red && "text-destructive", stat.green && "text-emerald-600 dark:text-emerald-400", stat.red2 && "text-destructive")}>{stat.value}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{stat.note}</p>
                        </div>
                      ))}
                    </div>

                    {/* Weekly Breakdown */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20 border-b border-border">
                            {[t("weekOf") || "Week of", t("rent"), t("commission"), t("expenses"), t("netPay")].map((h, i) => (
                              <th key={i} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${i === 0 ? "text-left pl-5" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {mondays.map(ws => {
                            const we = getWeekEnd(ws);
                            const wStr = ws.toISOString().split("T")[0];
                            const weStr = we.toISOString().split("T")[0];
                            const wRent = payments.filter(p => p.status === "paid" && p.period >= wStr && p.period <= weStr).reduce((s, p) => s + (p.amount || 0), 0);
                            const wComm = services.filter(s => s.service_date >= wStr && s.service_date <= weStr).reduce((s, e) => s + (e.owner_earnings || 0), 0);
                            const wExp = expenses.filter(e => e.expense_date >= wStr && e.expense_date <= weStr).reduce((s, e) => s + (e.amount || 0), 0);
                            const wNet = wRent + wComm - wExp;
                            return (
                              <tr key={wStr} className="hover:bg-muted/20">
                                <td className="pl-5 pr-4 py-2.5 text-muted-foreground text-xs">{ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(wRent)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-xs text-primary">{formatCurrency(wComm)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-xs text-destructive">−{formatCurrency(wExp)}</td>
                                <td className={cn("px-4 py-2.5 text-right font-mono text-xs font-semibold", wNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                  {wNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(wNet))}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-muted/20 border-t border-border font-semibold">
                            <td className="pl-5 py-2.5 text-xs">{t("totals") || "Totals"}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(rentIncome)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs text-primary">{formatCurrency(commissionIncome)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs text-destructive">−{formatCurrency(totalExpenses)}</td>
                            <td className={cn("px-4 py-2.5 text-right font-mono text-xs font-bold", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                              {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Per-Stylist Breakdown */}
                    <PerStylistBreakdown services={monthSvcs} payments={monthPmts} renters={renters} renterMap={renterMap} monthStr={m} />
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

function PayrollHistory({ renters, services }) {
  const { t } = useLanguage();
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const monthServices = services.filter(s => s.service_date?.startsWith(selectedMonth));
  const rentRenters = renters.filter(r => r.payment_model === "rent");
  const commRenters = renters.filter(r => r.payment_model === "commission");

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{t("hourlyPayroll")}</p>
          <p className="font-serif text-base font-medium mt-0.5">Per-Stylist Breakdown</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => {
              const [yr, mo] = m.split("-").map(Number);
              return <SelectItem key={m} value={m}>{new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {rentRenters.length > 0 && (
        <div>
          <div className="px-5 py-2.5 bg-muted/20 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rentStylists") || "Rent Stylists"}</p>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/10">
              {[t("stylists"), t("rentAmount") || "Rent Amount", t("totalRevenue")].map(h => <th key={h} className={`px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ${h === t("stylists") ? "text-left pl-5" : "text-right"}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rentRenters.map(r => {
                const rs = monthServices.filter(s => s.renter_id === r.id);
                const rev = rs.reduce((s, e) => s + (e.amount || 0), 0);
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="pl-5 pr-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.rent_amount)}/{freqLabel(r.frequency)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(rev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {commRenters.length > 0 && (
        <div>
          <div className={cn("px-5 py-2.5 bg-muted/20 border-b border-border", rentRenters.length > 0 && "border-t border-border")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("commissionStylists") || "Commission Stylists"}</p>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/10">
              {[t("stylists"), t("services"), t("amount"), t("stylistsEarnings"), `${t("ourCommission")} ✦`].map(h => <th key={h} className={`px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ${h === t("stylists") ? "text-left pl-5" : "text-right"}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {commRenters.map(r => {
                const rs = monthServices.filter(s => s.renter_id === r.id);
                const total = rs.reduce((s, e) => s + (e.amount || 0), 0);
                const their = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
                const ours = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="pl-5 pr-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-right">{rs.length}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(their)}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary font-semibold">{formatCurrency(ours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PerStylistBreakdown({ services, payments, renters, renterMap, monthStr }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const rentRenters = renters.filter(r => r.payment_model === "rent");
  const commRenters = renters.filter(r => r.payment_model === "commission");

  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 text-sm min-h-[44px]">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("perStylistBreakdown") || "Per-Stylist Breakdown"}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-4">
          {rentRenters.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("rentStylists") || "Rent Stylists"}</p>
              <div className="space-y-1">
                {rentRenters.map(r => {
                  const p = payments.find(x => x.renter_id === r.id);
                  const rs = services.filter(s => s.renter_id === r.id);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 text-sm min-h-[44px]">
                      <span className="font-medium">{r.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{formatCurrency(r.rent_amount)} rent</span>
                        <span className="font-mono">{formatCurrency(rs.reduce((s, e) => s + (e.amount || 0), 0))} services</span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", p?.status === "paid" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>{p?.status || "pending"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {commRenters.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("commissionStylists") || "Commission Stylists"}</p>
              <div className="space-y-1">
                {commRenters.map(r => {
                  const rs = services.filter(s => s.renter_id === r.id);
                  const total = rs.reduce((s, e) => s + (e.amount || 0), 0);
                  const their = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
                  const ours = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 text-sm min-h-[44px]">
                      <span className="font-medium">{r.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{rs.length} services</span>
                        <span className="font-mono">{formatCurrency(total)} total</span>
                        <span className="font-mono text-primary">+{formatCurrency(ours)} ours</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}