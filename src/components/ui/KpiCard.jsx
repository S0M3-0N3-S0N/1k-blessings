import { cn } from "@/lib/utils";

export default function KpiCard({ label, value, sub, icon: Icon, accent = false, className }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 flex flex-col gap-3",
      className
    )}>
      {Icon && (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          accent ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn("w-4 h-4", accent ? "text-primary" : "text-muted-foreground")} />
        </div>
      )}
      <div>
        <p className="font-mono text-2xl font-medium tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}