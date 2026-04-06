import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ClockInOut({ renter, timeEntries, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const activeEntry = timeEntries.find(t => t.clock_in && !t.clock_out);
  const isClockedIn = !!activeEntry;

  const handleClockIn = async () => {
    setLoading(true);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    await base44.entities.TimeEntry.create({
      renter_id: renter.id,
      clock_in: now.toISOString(),
      week_start: weekStart.toISOString().split("T")[0],
      total_hours: 0,
    });
    setLoading(false);
    onUpdate();
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setLoading(true);
    const now = new Date();
    const clockIn = new Date(activeEntry.clock_in);
    const diffMs = now - clockIn;
    const totalHours = diffMs / (1000 * 60 * 60);
    await base44.entities.TimeEntry.update(activeEntry.id, {
      clock_out: now.toISOString(),
      total_hours: Math.round(totalHours * 100) / 100,
    });
    setLoading(false);
    onUpdate();
  };

  const elapsedDisplay = () => {
    if (!activeEntry) return null;
    const diff = Date.now() - new Date(activeEntry.clock_in).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className={cn("rounded-xl border p-5", isClockedIn ? "bg-emerald-50 border-emerald-200" : "bg-card border-border")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isClockedIn ? "bg-emerald-500" : "bg-muted")}>
            <Clock className={cn("w-5 h-5", isClockedIn ? "text-white" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm font-semibold">{isClockedIn ? "Currently Clocked In" : "Not Clocked In"}</p>
            {isClockedIn && (
              <p className="text-xs text-emerald-700 font-mono mt-0.5">{elapsedDisplay()} elapsed</p>
            )}
            {!isClockedIn && (
              <p className="text-xs text-muted-foreground mt-0.5">Tap to start your shift</p>
            )}
          </div>
        </div>
        <Button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          variant={isClockedIn ? "destructive" : "default"}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isClockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {isClockedIn ? "Clock Out" : "Clock In"}
        </Button>
      </div>
    </div>
  );
}