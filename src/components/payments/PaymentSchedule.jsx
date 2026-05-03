import { formatCurrency, freqLabel, getInitials, getAvatarColor, cn, calcMonthlyRent, isPaymentOverdue } from "@/lib/utils";
import { CalendarDays, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function PaymentSchedule({ renters, payments, currency }) {
  const activeRenters = renters.filter(r => r.status === 'active');

  if (activeRenters.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center animate-fade-in">
        <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Add renters to see the payment schedule.</p>
      </div>
    );
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold">Payment Schedule</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {activeRenters.map((r, i) => {
          const payment = payments.find(p => p.renter_id === r.id && p.period?.startsWith(currentMonth));
          const isPaid = payment?.status === 'paid';
          const overdue = isPaymentOverdue(payment, r);
          const monthlyTotal = calcMonthlyRent(r, currentMonth);
          const avatar = getAvatarColor(i);

          const StatusIcon = isPaid ? CheckCircle2 : overdue ? AlertCircle : Clock;
          const statusLabel = isPaid ? 'Paid' : overdue ? 'Overdue' : 'Pending';
          const statusColor = isPaid ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : overdue ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200';

          return (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold", avatar.bg, avatar.text)}>
                  {getInitials(r.name)}
                </div>
                <div>
                  <p className="text-sm font-medium">{r.name || 'Unnamed'}</p>
                  <p className="text-[11px] text-muted-foreground">{r.role || 'Station'} · {freqLabel(r.frequency)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold">{formatCurrency(monthlyTotal, currency)}/mo</p>
                <div className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border mt-1", statusColor)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}