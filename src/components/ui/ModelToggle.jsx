import { cn } from "@/lib/utils";

export default function ModelToggle({ value, onChange }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {["rent", "commission"].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 py-2 text-sm font-semibold transition-all capitalize",
            value === m
              ? "bg-primary text-white"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "rent" ? "Rent Model" : "Commission Model"}
        </button>
      ))}
    </div>
  );
}