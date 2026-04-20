import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

function elapsed(clockIn) {
  const diff = Date.now() - new Date(clockIn).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function ClockInOut({ renterId, onRefresh }) {
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [tick, setTick] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!renterId) return;
    base44.entities.TimeEntry.filter({ renter_id: renterId }).then(entries => {
      const open = entries.find(e => e.clock_in && !e.clock_out);
      setActiveEntry(open || null);
      setLoading(false);
    });
  }, [renterId]);

  // Live ticker
  useEffect(() => {
    if (!activeEntry) return;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const handleClockIn = async () => {
    setActing(true);
    const entry = await base44.entities.TimeEntry.create({
      renter_id: renterId,
      clock_in: new Date().toISOString(),
    });
    setActiveEntry(entry);
    toast({ title: "Clocked in ✓" });
    setActing(false);
    onRefresh?.();
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setActing(true);
    const now = new Date();
    const clockIn = new Date(activeEntry.clock_in);
    const totalHours = parseFloat(((now - clockIn) / 3600000).toFixed(2));
    await base44.entities.TimeEntry.update(activeEntry.id, {
      clock_out: now.toISOString(),
      total_hours: totalHours,
    });
    setActiveEntry(null);
    toast({ title: `Clocked out — ${totalHours}h logged` });
    setActing(false);
    onRefresh?.();
  };

  if (loading) return <div className="h-20 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;

  const isIn = !!activeEntry;

  return (
    <div className={cn(
      "rounded-xl border p-5 flex items-center justify-between gap-4",
      isIn ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
    )}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("w-2.5 h-2.5 rounded-full", isIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
          <p className="text-sm font-semibold">{isIn ? "Currently Clocked In" : "Clocked Out"}</p>
        </div>
        {isIn && (
          <p className="text-xs text-muted-foreground">
            Since {new Date(activeEntry.clock_in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {elapsed(activeEntry.clock_in)} elapsed
          </p>
        )}
        {!isIn && <p className="text-xs text-muted-foreground">Ready to start your shift</p>}
      </div>
      <button
        onClick={isIn ? handleClockOut : handleClockIn}
        disabled={acting}
        className={cn(
          "min-h-[44px] min-w-[100px] rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
          isIn
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
            : "btn-gold"
        )}
      >
        {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isIn ? "Clock Out" : "Clock In"}
      </button>
    </div>
  );
}