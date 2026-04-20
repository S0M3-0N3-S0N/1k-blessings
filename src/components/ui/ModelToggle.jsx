import { cn } from "@/lib/utils";

const MODELS = [
  { value: "rent", label: "Rent" },
  { value: "commission", label: "Commission" },
  { value: "hourly", label: "Hourly" },
];

export default function ModelToggle({ value, onChange }) {
  return (
    <div className="flex rounded-xl border border-border overflow-hidden p-0.5 bg-muted/30 gap-0.5">
      {MODELS.map(m => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all min-h-[40px]",
            value === m.value
              ? "btn-gold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}