import { cn } from "@/lib/utils";

/**
 * ownerPct: 0-100, how much the owner keeps
 */
export default function SplitBar({ ownerPct = 40, height = "h-1.5", className }) {
  const renterPct = 100 - ownerPct;
  return (
    <div className={cn("w-full rounded-full overflow-hidden bg-muted flex", height, className)}>
      <div
        className="bg-primary transition-all duration-300 h-full"
        style={{ width: `${ownerPct}%` }}
      />
      <div
        className="bg-muted-foreground/30 transition-all duration-300 h-full"
        style={{ width: `${renterPct}%` }}
      />
    </div>
  );
}