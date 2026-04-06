import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EVENT_COLORS = {
  callout: "bg-red-100 text-red-700 border-red-200",
  day_off: "bg-blue-100 text-blue-700 border-blue-200",
  shop_event: "bg-indigo-100 text-indigo-700 border-indigo-200",
};
const EVENT_LABELS = { callout: "Call-out", day_off: "Day Off", shop_event: "Shop Event" };

export default function TeamCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [events, setEvents] = useState([]);
  const [renters, setRenters] = useState([]);
  const [myRenter, setMyRenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", type: "day_off", date: "", renter_id: "" });

  useEffect(() => {
    Promise.all([
      base44.entities.CalendarEvent.list(),
      base44.entities.Renter.list(),
    ]).then(([ev, r]) => {
      setEvents(ev);
      setRenters(r);
      if (!isAdmin && user?.email) {
        setMyRenter(r.find(x => x.user_email === user.email) || null);
      }
      setLoading(false);
    });
  }, [user, isAdmin]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const eventsInMonth = events.filter(e => {
    const d = e.date?.slice(0, 7);
    return d === `${year}-${String(month + 1).padStart(2, "0")}`;
  });

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return eventsInMonth.filter(e => e.date === dateStr);
  };

  const handleAdd = async () => {
    if (!addForm.title || !addForm.date) return;
    const renter_id = isAdmin ? (addForm.renter_id || "") : (myRenter?.id || "");
    await base44.entities.CalendarEvent.create({ ...addForm, renter_id });
    setShowAdd(false);
    setAddForm({ title: "", type: "day_off", date: "", renter_id: "" });
    const ev = await base44.entities.CalendarEvent.list();
    setEvents(ev);
  };

  const handleDelete = async (id) => {
    await base44.entities.CalendarEvent.delete(id);
    setEvents(events.filter(e => e.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule & time off</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <span key={type} className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md border", color)}>
            {EVENT_LABELS[type]}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-border bg-muted/20" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = getEventsForDay(day);
            const isToday = dateStr === today;
            return (
              <div key={day} className={cn("min-h-[80px] border-r border-b border-border p-1.5 text-xs", isToday && "bg-primary/5")}>
                <span className={cn("inline-flex w-5 h-5 items-center justify-center rounded-full text-xs font-semibold mb-1",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id} className={cn("flex items-center justify-between rounded px-1 py-0.5 text-[10px] font-medium border", EVENT_COLORS[ev.type] || "bg-slate-100 text-slate-600 border-slate-200")}>
                      <span className="truncate flex-1">{ev.title}</span>
                      {(isAdmin || ev.renter_id === myRenter?.id) && (
                        <button onClick={() => handleDelete(ev.id)} className="ml-1 opacity-60 hover:opacity-100 shrink-0">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Event title" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} className="h-9" autoFocus />
            <Select value={addForm.type} onValueChange={v => setAddForm({ ...addForm, type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="callout">Call-out / Absence</SelectItem>
                <SelectItem value="day_off">Day Off</SelectItem>
                {isAdmin && <SelectItem value="shop_event">Shop Event</SelectItem>}
              </SelectContent>
            </Select>
            <Input type="date" value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} className="h-9" />
            {isAdmin && (
              <Select value={addForm.renter_id || "none"} onValueChange={v => setAddForm({ ...addForm, renter_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Assign to renter (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Shop-wide</SelectItem>
                  {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 h-9" onClick={handleAdd} disabled={!addForm.title || !addForm.date}>Add Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}