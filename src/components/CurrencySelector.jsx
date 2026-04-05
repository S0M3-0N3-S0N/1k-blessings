import { cn } from "@/lib/utils";

const currencies = [
  { symbol: '$', label: 'USD' },
  { symbol: '€', label: 'EUR' },
  { symbol: '£', label: 'GBP' },
];

export default function CurrencySelector({ value, onChange }) {
  return (
    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
      {currencies.map(c => (
        <button
          key={c.symbol}
          onClick={() => onChange(c.symbol)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            value === c.symbol
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {c.symbol} {c.label}
        </button>
      ))}
    </div>
  );
}