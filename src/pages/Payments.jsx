import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, freqMultiplier, freqLabel, getInitials, getAvatarColor, cn } from "@/lib/utils";
import CurrencySelector from "../components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

export default function Payments() {
  const [renters, setRenters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [r, p] = await Promise.all([
      base44.entities.Renter.list(),
      base44.entities.Payment.list(),
    ]);
    setRenters(r);
    setPayments(p);
    setLoading(false);
  };

  const getPaymentStatus = (renter) => {
    const renterPayments = payments.filter(p => p.renter_id === renter.id && p.period === currentMonth);
    if (renterPayments.some(p => p.status === 'paid')) return 'paid';
    if (now.getDate() > 5) return 'overdue';
    return 'pending';
  };

  const togglePayment = async (renter) => {
    const status = getPaymentStatus(renter);
    const existing = payments.find(p => p.renter_id === renter.id && p.period === currentMonth);

    if (status === 'paid' && existing) {
      await base44.entities.Payment.update(existing.id, { status: 'pending', paid_date: null });
    } else if (existing) {
      await base44.entities.Payment.update(existing.id, { status: 'paid', paid_date: new Date().toISOString() });
    } else {
      await base44.entities.Payment.create({
        renter_id: renter.id,
        amount: (renter.rent_amount || 0) * freqMultiplier(renter.frequency),
        period: currentMonth,
        status: 'paid',
        paid_date: new Date().toISOString(),
        due_date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      });
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRenters = renters.filter(r => r.status === 'active');
  const displayRenters = filterStatus === "all"
    ? activeRenters
    : activeRenters.filter(r => getPaymentStatus(r) === filterStatus);

  const paidCount = activeRenters.filter(r => getPaymentStatus(r) === 'paid').length;
  const overdueCount = activeRenters.filter(r => getPaymentStatus(r) === 'overdue').length;
  const pendingCount = activeRenters.filter(r => getPaymentStatus(r) === 'pending').length;

  const statusConfig = {
    paid: { icon: CheckCircle2, label: 'Paid', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    overdue: { icon: AlertCircle, label: 'Overdue', color: 'text-red-600 bg-red-50 border-red-200' },
    pending: { icon: Clock, label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Track rent collection
          </p>
        </div>
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">{paidCount} Paid</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{pendingCount} Pending</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700">{overdueCount} Overdue</span>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rent Payments</h3>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-border">
          {displayRenters.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {activeRenters.length === 0 ? 'Add renters first to track payments.' : 'No payments match this filter.'}
            </p>
          ) : (
            displayRenters.map((r, i) => {
              const status = getPaymentStatus(r);
              const config = statusConfig[status];
              const StatusIcon = config.icon;
              const monthlyAmount = (r.rent_amount || 0) * freqMultiplier(r.frequency);
              const avatar = getAvatarColor(i);

              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", avatar.bg, avatar.text)}>
                      {getInitials(r.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{r.role || 'Station'} · {freqLabel(r.frequency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold">{formatCurrency(monthlyAmount, currency)}</p>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border", config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={status === 'paid' ? 'outline' : 'default'}
                      className="h-8 text-xs min-w-[80px]"
                      onClick={() => togglePayment(r)}
                    >
                      {status === 'paid' ? 'Undo' : 'Mark Paid'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}