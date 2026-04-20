import { cn } from "@/lib/utils";

export default function KpiCard({ label, value, sub, icon: Icon, accent = false, className, glow = false }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-3 md:p-4 flex flex-col gap-2 relative overflow-hidden",
      glow && "shadow-[0_0_20px_rgba(201,152,74,0.12)]",
      className
    )}>
      {glow && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
      {Icon && (
        <div className={cn("w-7 md:w-8 h-7 md:h-8 rounded-lg flex items-center justify-center shrink-0", accent ? "bg-primary/15" : "bg-muted")}>
          <Icon className={cn("w-3.5 md:w-4 h-3.5 md:h-4", accent ? "text-primary" : "text-muted-foreground")} />
        </div>
      )}
      <div className="relative">
        <p className={cn("font-mono text-xl md:text-2xl font-medium tracking-tight", accent && "text-primary")}>{value}</p>
        <p className="text-[10px] md:text-[11px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[9px] md:text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}