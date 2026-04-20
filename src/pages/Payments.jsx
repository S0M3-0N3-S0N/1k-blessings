import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, toWeekly, freqLabel } from "@/lib/utils";
import { Loader2, CheckCircle2, RotateCcw, Info } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard.jsx";
import StatusBadge from "@/components/ui/StatusBadge.jsx";
import GoldButton from "@/components/ui/GoldButton.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Payments() {
  const [renters, setRenters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [marking, setMarking] = useState(null);

  const loadData = useCallback(async () => {
    const [r, p] = await Promise.all([base44.entities.Renter.list(), base44.entities.Payment.list("-period")]);
    setRenters(r); setPayments(p); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Only rent-model renters
  const rentRenters = renters.filter(r => r.payment_model === "rent" && r.status === "active");

  const getRenterStatus = (renter) => {
    const existing = payments.find(p => p.renter_id === renter.id && p.period?.startsWith(currentMonthStr));
    if (existing?.status === "paid") return { status: "paid", payment: existing };
    if (now.getDate() > 5) return { status: "overdue", payment: existing };
    return { status: "pending", payment: existing };
  };

  const markPaid = async (renter) => {
    setMarking(renter.id);
    const { payment } = getRenterStatus(renter);
    if (payment) {
      await base44.entities.Payment.update(payment.id, { status: "paid", paid_date: new Date().toISOString() });
    } else {
      await base44.entities.Payment.create({
        renter_id: renter.id,
        amount: renter.rent_amount || 0,
        period: currentMonthStr,
        status: "paid",
        paid_date: new Date().toISOString(),
      });
    }
    setMarking(null); loadData();
  };

  const markPending = async (renter) => {
    setMarking(renter.id);
    const { payment } = getRenterStatus(renter);
    if (payment) await base44.entities.Payment.update(payment.id, { status: "pending", paid_date: null });
    setMarking(null); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const rows = rentRenters.map(r => ({ ...r, ...getRenterStatus(r) }));
  const filteredRows = filter === "all" ? rows : rows.filter(r => r.status === filter);

  const paidCount = rows.filter(r => r.status === "paid").length;
  const pendingCount = rows.filter(r => r.status === "pending").length;
  const overdueCount = rows.filter(r => r.status === "overdue").length;
  const collectedAmt = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.payment?.amount || r.rent_amount || 0), 0);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Finance</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{monthLabel}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Rent collection</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Banner */}
        <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Showing rent-model stylists only. Commission-model stylists earn through service splits, not rent.
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Collected" value={formatCurrency(collectedAmt)} accent />
          <KpiCard label="Paid" value={paidCount} />
          <KpiCard label="Pending" value={pendingCount} />
          <KpiCard label="Overdue" value={overdueCount} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {rentRenters.length === 0 ? "No rent-model stylists found." : "No payments match this filter."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filteredRows.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.role} · {freqLabel(r.frequency)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className="font-mono text-sm font-semibold">{formatCurrency(r.rent_amount)}<span className="text-muted-foreground text-xs font-normal">/{freqLabel(r.frequency)}</span></span>
                    <StatusBadge status={r.status} />
                    {r.status !== "paid" ? (
                      <GoldButton size="sm" onClick={() => markPaid(r)} disabled={marking === r.id}>
                        {marking === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Mark Paid
                      </GoldButton>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => markPending(r)} disabled={marking === r.id}>
                        <RotateCcw className="w-3 h-3 mr-1" />Undo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}