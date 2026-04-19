import { cn } from "@/lib/utils";

const STATUS = {
  paid:     "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  pending:  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  overdue:  "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  active:   "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export default function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-widest",
      STATUS[status] || STATUS.pending,
      className
    )}>
      {status}
    </span>
  );
}