import { cn } from "@/lib/utils";

export default function ModelToggle({ value, onChange, className }) {
  return (
    <div className={cn("flex rounded-xl border border-border overflow-hidden p-0.5 bg-muted/30 gap-0.5", className)}>
      {[
        { v: "rent", label: "Rent" },
        { v: "commission", label: "Commission" },
      ].map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
            value === v
              ? "btn-gold shadow-sm"
              : "text-muted-foreground hover:text-foreground bg-transparent"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}