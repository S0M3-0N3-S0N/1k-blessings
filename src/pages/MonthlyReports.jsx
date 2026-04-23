import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekEnd, cn, freqLabel } from "@/lib/utils";
import {
  Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Download, DollarSign, ArrowUpRight, ArrowDownRight, Scissors
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

const CAT_COLORS = {
  supplies: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  cleaning: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  software: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  utilities: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  marketing: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  equipment: "bg-stone-500/15 text-stone-500 border-stone-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export default function MonthlyReports() {
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

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

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

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

  // YTD summary
  const currentYear = new Date().getFullYear();
  const ytdMonths = allMonths.filter(m => m.startsWith(`${currentYear}`));
  const ytdIncome = ytdMonths.reduce((s, m) => s + getMonthData(m).totalIncome, 0);
  const ytdExpenses = ytdMonths.reduce((s, m) => s + getMonthData(m).totalExpenses, 0);
  const ytdNet = ytdIncome - ytdExpenses;

  const exportCSV = () => {
    const rows = [["Month", "Rental Income", "Commission Income", "Total Income", "Expenses", "Net Profit"]];
    allMonths.forEach(m => {
      const { rentIncome, commissionIncome, totalIncome, totalExpenses, netProfit } = getMonthData(m);
      const [yr, mo] = m.split("-").map(Number);
      const label = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      rows.push([label, rentIncome.toFixed(2), commissionIncome.toFixed(2), totalIncome.toFixed(2), totalExpenses.toFixed(2), netProfit.toFixed(2)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "financial-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("reports")}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("financialReports")}</h1>
          </div>
          {allMonths.length > 0 && (
            <Button variant="outline" size="sm" className="min-h-[44px] gap-2 shrink-0" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
        </div>

        {/* YTD Summary Cards */}
        {ytdMonths.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="p-3 md:p-4">
                <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Income</p>
                <p className="font-mono text-sm md:text-xl font-semibold text-primary">{formatCurrency(ytdIncome)}</p>
              </div>
              <div className="p-3 md:p-4">
                <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Expenses</p>
                <p className="font-mono text-sm md:text-xl font-semibold text-destructive">−{formatCurrency(ytdExpenses)}</p>
              </div>
              <div className="p-3 md:p-4">
                <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Net</p>
                <p className={cn("font-mono text-sm md:text-xl font-semibold", ytdNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {ytdNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(ytdNet))}
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-muted/30 border-t border-border">
              <p className="text-[9px] text-muted-foreground">{currentYear} {t("ytdYearToDate")}</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {[{ id: "overview", label: t("monthly") }, { id: "stylists", label: t("stylists") }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn("flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all min-h-[40px]",
                activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {allMonths.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
          </div>
        )}

        {/* Monthly Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {allMonths.map((m, idx) => {
              const data = getMonthData(m);
              const { rentIncome, commissionIncome, totalIncome, totalExpenses, netProfit, monthSvcs, monthPmts, monthExp, yr, mo } = data;
              const label = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
              const isOpen = expanded[m] !== false && idx === 0 ? true : !!expanded[m];

              const prevM = allMonths[idx + 1];
              const prevData = prevM ? getMonthData(prevM) : null;
              const trendPct = prevData && prevData.netProfit !== 0
                ? Math.round(((netProfit - prevData.netProfit) / Math.abs(prevData.netProfit)) * 100)
                : null;

              const mondays = getMondaysInMonth(yr, mo);
              const incomeBarW = totalIncome > 0 ? Math.min(100, (totalIncome / (totalIncome + totalExpenses)) * 100) : 0;

              return (
                <div key={m} className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Month Header */}
                  <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors min-h-[72px]" onClick={() => toggle(m)}>
                    <div className="text-left">
                      <p className="font-serif text-base md:text-lg font-medium">{label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {trendPct !== null && (
                          <div className={cn("flex items-center gap-1 text-[10px] font-semibold", trendPct >= 0 ? "text-emerald-500" : "text-red-500")}>
                            {trendPct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(trendPct)}% {t("vsPrior")}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground">{monthSvcs.length} {t("services")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn("font-mono font-bold text-lg", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{t("netProfit")}</p>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-px bg-border">
                        {[
                          { label: t("rentalIncome"), value: formatCurrency(rentIncome), color: "text-foreground" },
                          { label: t("commission"), value: formatCurrency(commissionIncome), color: "text-primary" },
                          { label: t("expenses"), value: `−${formatCurrency(totalExpenses)}`, color: "text-destructive" },
                          { label: t("netProfit"), value: `${netProfit >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netProfit))}`, color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive" },
                        ].map(stat => (
                          <div key={stat.label} className="bg-card px-4 py-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</p>
                            <p className={cn("font-mono font-semibold text-sm mt-0.5", stat.color)}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Expense breakdown */}
                      {monthExp.length > 0 && (
                        <div className="px-4 py-3 border-t border-border">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("categoryBreakdown")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(monthExp.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + (e.amount || 0); return acc; }, {})).map(([cat, total]) => (
                              <div key={cat} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium", CAT_COLORS[cat] || CAT_COLORS.other)}>
                                <span className="capitalize">{cat}</span>
                                <span className="font-mono font-semibold">−{formatCurrency(total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weekly Breakdown */}
                      <div className="border-t border-border">
                        <div className="px-4 py-2.5 bg-muted/20">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("weeklyBreakdown")}</p>
                        </div>
                        <div className="divide-y divide-border">
                          {mondays.map(ws => {
                            const we = getWeekEnd(ws);
                            const wStr = ws.toISOString().split("T")[0];
                            const weStr = we.toISOString().split("T")[0];
                            const wRent = payments.filter(p => p.status === "paid" && p.period >= wStr && p.period <= weStr).reduce((s, p) => s + (p.amount || 0), 0);
                            const wComm = services.filter(s => s.service_date >= wStr && s.service_date <= weStr).reduce((s, e) => s + (e.owner_earnings || 0), 0);
                            const wExp = expenses.filter(e => e.expense_date >= wStr && e.expense_date <= weStr).reduce((s, e) => s + (e.amount || 0), 0);
                            const wNet = wRent + wComm - wExp;
                            return (
                              <div key={wStr} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10">
                                <span className="text-xs text-muted-foreground">
                                  {ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                  <span className="text-muted-foreground hidden sm:inline" title={t("totalRevenue")}>{formatCurrency(wRent + wComm)}</span>
                                      <span className="text-destructive hidden sm:inline">−{formatCurrency(wExp)}</span>
                                  <span className={cn("font-semibold", wNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                    {wNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(wNet))}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {/* Totals row */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 font-semibold">
                            <span className="text-xs">{t("totals")}</span>
                            <div className="flex items-center gap-3 text-xs font-mono">
                              <span className="text-muted-foreground hidden sm:inline">{formatCurrency(totalIncome)}</span>
                              <span className="text-destructive hidden sm:inline">−{formatCurrency(totalExpenses)}</span>
                              <span className={cn("font-bold", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                {netProfit >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netProfit))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Per-Stylist Breakdown */}
                      <PerStylistBreakdown services={monthSvcs} payments={monthPmts} renters={renters} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stylists Tab */}
        {activeTab === "stylists" && (
          <PayrollHistory renters={renters} services={services} payments={payments} />
        )}
      </div>
    </PullToRefresh>
  );
}

function PayrollHistory({ renters, services, payments }) {
  const { t } = useLanguage();
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const monthServices = services.filter(s => s.service_date?.startsWith(selectedMonth));
  const monthPayments = payments.filter(p => p.period?.startsWith(selectedMonth));
  const rentRenters = renters.filter(r => r.payment_model === "rent");
  const commRenters = renters.filter(r => r.payment_model === "commission");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium text-muted-foreground">{t("selectMonth")}</p>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => {
              const [yr, mo] = m.split("-").map(Number);
              return <SelectItem key={m} value={m}>{new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {rentRenters.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/20 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rentStylists")}</p>
          </div>
          <div className="divide-y divide-border">
            {rentRenters.map(r => {
              const rs = monthServices.filter(s => s.renter_id === r.id);
              const rev = rs.reduce((s, e) => s + (e.amount || 0), 0);
              const pmt = monthPayments.find(p => p.renter_id === r.id);
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(r.rent_amount)}/{freqLabel(r.frequency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{formatCurrency(rev)}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      pmt?.status === "paid" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>
                      {pmt?.status || "pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {commRenters.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/20 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("commissionStylists")}</p>
          </div>
          <div className="divide-y divide-border">
            {commRenters.map(r => {
              const rs = monthServices.filter(s => s.renter_id === r.id);
              const total = rs.reduce((s, e) => s + (e.amount || 0), 0);
              const their = rs.reduce((s, e) => s + (e.renter_earnings || 0), 0);
              const ours = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
              return (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{r.name}</p>
                    <span className="text-xs text-muted-foreground">{rs.length} {t("services")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/30 rounded-lg px-2 py-1.5">
                      <p className="font-mono text-xs font-semibold">{formatCurrency(total)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{t("totals")}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg px-2 py-1.5">
                      <p className="font-mono text-xs font-semibold">{formatCurrency(their)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{t("stylist")}</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg px-2 py-1.5">
                      <p className="font-mono text-xs font-semibold text-primary">{formatCurrency(ours)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{t("ourCommission")} ✦</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rentRenters.length === 0 && commRenters.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
        </div>
      )}
    </div>
  );
}

function PerStylistBreakdown({ services, payments, renters }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rentRenters = renters.filter(r => r.payment_model === "rent");
  const commRenters = renters.filter(r => r.payment_model === "commission");
  if (rentRenters.length === 0 && commRenters.length === 0) return null;

  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 min-h-[48px]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("perStylistDetail")}</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {rentRenters.map(r => {
            const p = payments.find(x => x.renter_id === r.id);
            const rs = services.filter(s => s.renter_id === r.id);
            return (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <span className="font-medium text-sm">{r.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{formatCurrency(rs.reduce((s, e) => s + (e.amount || 0), 0))}</span>
                  <span className={cn("px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider text-[10px]",
                    p?.status === "paid" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>
                    {p?.status || "pending"}
                  </span>
                </div>
              </div>
            );
          })}
          {commRenters.map(r => {
            const rs = services.filter(s => s.renter_id === r.id);
            const ours = rs.reduce((s, e) => s + (e.owner_earnings || 0), 0);
            return (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <span className="font-medium text-sm">{r.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{rs.length} {t("services").slice(0, 4)}</span>
                  <span className="font-mono text-primary font-semibold">+{formatCurrency(ours)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}