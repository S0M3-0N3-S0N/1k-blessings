import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, getWeekStart, getWeekEnd, formatDateRange, categoryBadge, toWeekly, cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, Copy, Check, Clock } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const WEEK_LABELS_KEYS = ["thisWeek", "lastWeek", "twoWeeksAgo", "threeWeeksAgo", "fourWeeksAgo"];

export default function Paystub() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [renter, setRenter] = useState(null);
  const [services, setServices] = useState([]);
  const [charges, setCharges] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const [renters, allCharges] = await Promise.all([
      base44.entities.Renter.filter({ user_email: user.email }),
      base44.entities.Charge.list(),
    ]);
    const r = renters[0] || null;
    setRenter(r);
    setCharges(allCharges.filter(c => !c.renter_id || c.renter_id === r?.id));
    if (r) {
      const [svcs, entries] = await Promise.all([
        base44.entities.ServiceEntry.list("-service_date", 300),
        base44.entities.TimeEntry.filter({ renter_id: r.id }),
      ]);
      setServices(svcs.filter(x => x.renter_id === r.id));
      setTimeEntries(entries);
    }
    setLoading(false);
  }, [user?.email]);
  useEffect(() => { loadData(); }, [loadData]);

  const ws = getWeekStart(new Date(), weekOffset);
  const we = getWeekEnd(ws);
  const wsStr = ws.toISOString().split("T")[0];
  const weStr = we.toISOString().split("T")[0];
  const weekServices = services.filter(s => s.service_date >= wsStr && s.service_date <= weStr);

  const weekTimeEntries = timeEntries.filter(e => {
    const d = e.clock_in?.split("T")[0];
    return d >= wsStr && d <= weStr;
  });

  const grossRevenue = weekServices.reduce((s, e) => s + (e.amount || 0), 0);
  const myEarnings = weekServices.reduce((s, e) => s + (e.renter_earnings || 0), 0);
  const tipTotal = weekServices.reduce((s, e) => s + (e.tip_amount || 0), 0);
  const weeklyRent = (renter?.payment_model === "rent" || renter?.payment_model === "hourly")
    ? toWeekly(renter.rent_amount || 0, renter.frequency)
    : 0;

  // Hourly calculations
  const totalHours = weekTimeEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const grossPay = totalHours * (renter?.hourly_wage || 0);
  const hourlyNetPay = grossPay - weeklyRent;

  const netPay = renter?.payment_model === "rent"
    ? grossRevenue - weeklyRent
    : renter?.payment_model === "hourly"
      ? hourlyNetPay
      : myEarnings + tipTotal;

  const copyPaySummary = () => {
    const lines = [
      `Pay Summary — ${formatDateRange(ws)}`,
      `Stylist: ${renter?.name}`,
      ``,
    ];
    if (renter?.payment_model === "rent") {
      lines.push(`Service Revenue: ${formatCurrency(grossRevenue)}`);
      lines.push(`Rent Deduction: -${formatCurrency(weeklyRent)}`);
      if (tipTotal > 0) lines.push(`Tips: +${formatCurrency(tipTotal)}`);
      lines.push(`Net Pay: ${formatCurrency(netPay)}`);
    } else if (renter?.payment_model === "hourly") {
      lines.push(`Hours Worked: ${totalHours.toFixed(2)}h`);
      lines.push(`Hourly Rate: ${formatCurrency(renter.hourly_wage)}/hr`);
      lines.push(`Gross Pay: ${formatCurrency(grossPay)}`);
      lines.push(`Rent Deduction: -${formatCurrency(weeklyRent)}`);
      if (grossRevenue > 0) lines.push(`Service Income: +${formatCurrency(grossRevenue)}`);
      if (tipTotal > 0) lines.push(`Tips: +${formatCurrency(tipTotal)}`);
      lines.push(`Net Pay: ${formatCurrency(netPay)}`);
    } else {
      lines.push(`Total Service Revenue: ${formatCurrency(grossRevenue)}`);
      lines.push(`Commission Earnings (${100 - (renter?.commission_owner || 40)}%): ${formatCurrency(myEarnings)}`);
      if (tipTotal > 0) lines.push(`Tips: +${formatCurrency(tipTotal)}`);
      lines.push(`Total Pay: ${formatCurrency(netPay)}`);
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      toast({ title: t("copiedToClipboard") });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!renter) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Your account is not linked to a stylist profile yet.</p>
    </div>
  );

  const heroLabel = renter.payment_model === "rent"
    ? t("netPay")
    : renter.payment_model === "hourly"
      ? t("thisWeekNetPay")
      : t("totalCommissionEarned");

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("earnings")}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("paystub")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => Math.min(4, o + 1))} className="p-2 rounded-lg border border-border hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <select className="text-xs bg-card border border-border rounded-lg px-2 py-2 font-medium min-h-[44px]" value={weekOffset} onChange={e => setWeekOffset(Number(e.target.value))}>
              {WEEK_LABELS_KEYS.map((l, i) => <option key={i} value={i}>{t(l)}</option>)}
            </select>
            <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden shadow-[0_0_30px_rgba(201,152,74,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{heroLabel}</p>
              <p className={cn("font-mono text-5xl font-bold tracking-tight mt-2", netPay < 0 && "text-destructive")}>{formatCurrency(netPay)}</p>
              <p className="text-xs text-muted-foreground mt-2">{formatDateRange(ws)}</p>
              {renter.payment_model === "hourly" && (
                <p className="text-xs text-muted-foreground mt-0.5">{totalHours.toFixed(2)}h × {formatCurrency(renter.hourly_wage)}/hr = {formatCurrency(grossPay)} gross</p>
              )}
            </div>
            <button onClick={copyPaySummary} className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hourly: Time Entries */}
        {renter.payment_model === "hourly" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="font-serif text-base font-medium">Hours Breakdown</p>
            </div>
            {weekTimeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hours logged this week.</p>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {weekTimeEntries.map(e => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3 min-h-[48px]">
                      <div>
                        <p className="text-sm font-medium">{e.clock_in?.split("T")[0]}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.clock_in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {e.clock_out && ` → ${new Date(e.clock_out).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold">{(e.total_hours || 0).toFixed(2)}h</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Hours</span>
                    <span className="font-mono font-semibold">{totalHours.toFixed(2)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">× {formatCurrency(renter.hourly_wage)}/hr</span>
                    <span className="font-mono font-semibold">{formatCurrency(grossPay)}</span>
                  </div>
                  {weeklyRent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("weeklyRentDeduction")}</span>
                      <span className="font-mono text-destructive">−{formatCurrency(weeklyRent)}</span>
                    </div>
                  )}
                  {grossRevenue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Income</span>
                      <span className="font-mono text-primary">+{formatCurrency(grossRevenue)}</span>
                    </div>
                  )}
                  {tipTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("tips")} (bonus)</span>
                      <span className="font-mono text-primary">+{formatCurrency(tipTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                    <span>{t("netPay")}</span>
                    <span className={cn("font-mono", netPay >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(netPay)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Services */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-serif text-base font-medium">
              {renter.payment_model === "commission" ? t("commissionBreakdown") : t("servicesThisWeek")}
            </p>
          </div>
          {weekServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t("noServicesThisWeek")}</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {weekServices.map(s => {
                  const cat = categoryBadge(s.category);
                  return (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3 min-h-[52px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", cat.className)}>{cat.label}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{s.description || "Service"}</p>
                          <p className="text-xs text-muted-foreground">{s.client_name || "—"} · {s.service_date}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {renter.payment_model === "commission" ? (
                          <>
                            <p className="font-mono text-sm font-semibold text-primary">{formatCurrency(s.renter_earnings)}</p>
                            <p className="text-[10px] text-muted-foreground">of {formatCurrency(s.amount)}</p>
                          </>
                        ) : (
                          <p className="font-mono text-sm font-semibold">{formatCurrency(s.amount)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2.5">
                {renter.payment_model === "rent" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("totalServiceRevenue")}</span>
                      <span className="font-mono font-semibold">{formatCurrency(grossRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("weeklyRentDeduction")}</span>
                      <span className="font-mono text-destructive">−{formatCurrency(weeklyRent)}</span>
                    </div>
                    {tipTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("tips")}</span>
                        <span className="font-mono text-primary">+{formatCurrency(tipTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                      <span>{t("netPay")}</span>
                      <span className={cn("font-mono", netPay >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(netPay)}</span>
                    </div>
                  </>
                )}
                {renter.payment_model === "commission" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission Earnings ({100 - (renter.commission_owner || 40)}%)</span>
                      <span className="font-mono font-semibold">{formatCurrency(myEarnings)}</span>
                    </div>
                    {tipTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("tips")} (bonus)</span>
                        <span className="font-mono text-primary">+{formatCurrency(tipTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                      <span>Total Pay</span>
                      <span className="font-mono text-primary">{formatCurrency(netPay)}</span>
                    </div>
                  </>
                )}
                {renter.payment_model === "hourly" && grossRevenue > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Revenue (bonus)</span>
                      <span className="font-mono font-semibold text-primary">+{formatCurrency(grossRevenue)}</span>
                    </div>
                    {tipTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("tips")} (bonus)</span>
                        <span className="font-mono text-primary">+{formatCurrency(tipTotal)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}