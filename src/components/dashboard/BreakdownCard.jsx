import { formatCurrency, freqMultiplier, freqLabel } from "@/lib/utils";

export default function BreakdownCard({ renters, charges, currency }) {
  const activeRenters = renters.filter(r => r.status === 'active');
  const chargesTotal = charges.reduce((s, c) => s + (c.amount || 0) * freqMultiplier(c.frequency), 0);
  const grandTotal = activeRenters.reduce((s, r) => s + (r.rent_amount || 0) * freqMultiplier(r.frequency), 0) + chargesTotal;

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold">Totals Breakdown</h3>
      </div>
      <div className="px-5 py-3 divide-y divide-border">
        {activeRenters.length === 0 && charges.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground text-center">No renters or charges yet</p>
        ) : (
          <>
            {activeRenters.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">
                  {r.name || 'Unnamed'}
                  <span className="text-xs opacity-60 ml-1">({freqLabel(r.frequency)})</span>
                </span>
                <span className="text-sm font-mono font-medium">
                  {formatCurrency((r.rent_amount || 0) * freqMultiplier(r.frequency), currency)}/mo
                </span>
              </div>
            ))}
            {chargesTotal > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Extra charges</span>
                <span className="text-sm font-mono font-medium">
                  {formatCurrency(chargesTotal, currency)}/mo
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 mt-1">
              <span className="text-base font-semibold">Total you collect</span>
              <span className="text-xl font-mono font-bold text-primary">
                {formatCurrency(grandTotal, currency)}/mo
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}