import { cn } from "@/lib/utils";

export default function SplitBar({ ownerPct = 40, height = "h-1.5", className, showLabels = false }) {
  const renterPct = 100 - ownerPct;
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full rounded-full overflow-hidden bg-muted/50 flex", height)}>
        <div className="bg-primary transition-all duration-300 h-full rounded-full" style={{ width: `${ownerPct}%` }} />
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-primary font-medium">Owner {ownerPct}%</span>
          <span className="text-[10px] text-muted-foreground">Stylist {renterPct}%</span>
        </div>
      )}
    </div>
  );
}