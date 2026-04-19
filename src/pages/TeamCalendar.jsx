import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PullToRefresh from "@/components/PullToRefresh";

const TYPE_COLORS = {
  callout: "bg-red-500/20 text-red-500 border-red-500/30",
  day_off: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  shop_event: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

const emptyForm = { title: "", description: "", type: "day_off", date: new Date().toISOString().split("T")[0], end_date: "", renter_id: "" };

export default function TeamCalendar() {
  const [events, setEvents] = useState([]);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const loadData = useCallback(async () => {
    const [e, r] = await Promise.all([base44.entities.CalendarEvent.list("-date"), base44.entities.Renter.list()]);
    setEvents(e); setRenters(r); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const monthLabel = displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter(e => e.date?.startsWith(monthStr));

  const renterMap = Object.fromEntries(renters.map(r => [r.id, r]));

  const handleSave = async () => {
    if (!form.title || !form.date) return;
    setSaving(true);
    await base44.entities.CalendarEvent.create(form);
    setShowAdd(false); setForm(emptyForm); setSaving(false); loadData();
  };

  const getDayEvents = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.filter(e => e.date === dateStr);
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Scheduling</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">Team Calendar</h1>
          </div>
          <GoldButton onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Add Event</GoldButton>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 hover:bg-muted rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-serif text-base font-medium">{monthLabel}</h2>
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 hover:bg-muted rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} className="border-r border-b border-border min-h-[80px]" />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayEvents = getDayEvents(day);
              const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
              return (
                <div key={day} className={cn("border-r border-b border-border min-h-[80px] p-1.5", isToday && "bg-primary/5")}>
                  <span className={cn("text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.map(e => (
                      <div key={e.id} className={cn("text-[9px] font-medium px-1 py-0.5 rounded truncate border", TYPE_COLORS[e.type] || TYPE_COLORS.day_off)}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event list */}
        {monthEvents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-serif text-sm font-medium text-muted-foreground">This Month's Events</h3>
            {monthEvents.sort((a,b) => a.date.localeCompare(b.date)).map(e => (
              <div key={e.id} className="bg-card rounded-xl border border-border flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border", TYPE_COLORS[e.type])}>{e.type.replace("_", " ")}</span>
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.date}{e.renter_id && ` · ${renterMap[e.renter_id]?.name || ""}`}</p>
                  </div>
                </div>
                <button onClick={() => base44.entities.CalendarEvent.delete(e.id).then(loadData)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="callout">Callout</SelectItem>
                <SelectItem value="day_off">Day Off</SelectItem>
                <SelectItem value="shop_event">Shop Event</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Stylist (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All / Shop</SelectItem>
                {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.title || !form.date}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}