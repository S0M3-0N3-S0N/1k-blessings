import { Trash2 } from "lucide-react";
import { cn, formatCurrency, freqMultiplier, freqLabel, getInitials, getAvatarColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function RenterCard({ renter, index, currency, onDelete }) {
  const avatar = getAvatarColor(index);
  const initials = getInitials(renter.name);
  const monthlyTotal = (renter.rent_amount || 0) * freqMultiplier(renter.frequency);

  const freqColors = {
    weekly: "bg-sky-50 text-sky-700 border-sky-200",
    biweekly: "bg-violet-50 text-violet-700 border-violet-200",
    monthly: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="group bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", avatar.bg, avatar.text)}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{renter.name || 'Unnamed'}</p>
            <p className="text-xs text-muted-foreground">{renter.role || 'Station'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(renter.id); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", freqColors[renter.frequency] || freqColors.monthly)}>
          {freqLabel(renter.frequency)}
        </span>
        {renter.status === 'active' ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
            Inactive
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-mono font-bold tracking-tight">
            {formatCurrency(renter.rent_amount || 0, currency)}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
            per {renter.frequency === 'monthly' ? 'month' : renter.frequency === 'weekly' ? 'week' : '2 weeks'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-mono">≈ {formatCurrency(monthlyTotal, currency)}/mo</p>
          {(renter.commission_owner !== undefined && renter.commission_owner !== 100) && (
            <p className="text-[10px] text-primary font-semibold mt-0.5">
              You {renter.commission_owner}% / Renter {100 - renter.commission_owner}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}