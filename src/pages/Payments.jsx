import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getWeekStart, freqLabel } from "@/lib/utils";
import { Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import GoldButton from "@/components/ui/GoldButton";
import PullToRefresh from "@/components/PullToRefresh";
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

  const markPaid = async (payment) => {
    setMarking(payment.id);
    await base44.entities.Payment.update(payment.id, { status: "paid", paid_date: new Date().toISOString() });
    setMarking(null); loadData();
  };

  const markPending = async (payment) => {
    setMarking(payment.id);
    await base44.entities.Payment.update(payment.id, { status: "pending", paid_date: null });
    setMarking(null); loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + (p.amount || 0), 0);

  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);
  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Finance</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Payments</h1>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Collected" value={formatCurrency(totalPaid)} accent />
          <KpiCard label="Pending" value={formatCurrency(totalPending)} />
          <KpiCard label="Overdue" value={formatCurrency(totalOverdue)} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No payments found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(p => {
                const r = renterMap[p.renter_id];
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{r?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{p.period || "—"} · {r ? freqLabel(r.frequency) : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{formatCurrency(p.amount)}</span>
                      <StatusBadge status={p.status} />
                      {p.status !== "paid" ? (
                        <GoldButton size="sm" onClick={() => markPaid(p)} disabled={marking === p.id}>
                          {marking === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Paid
                        </GoldButton>
                      ) : (
                        <button onClick={() => markPending(p)} disabled={marking === p.id} className="text-muted-foreground hover:text-foreground transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}