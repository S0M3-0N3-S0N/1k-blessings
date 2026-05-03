import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n";

const TYPE_COLORS = {
  callout:    "bg-red-500/20 text-red-500 border-red-500/30",
  day_off:    "bg-blue-500/20 text-blue-500 border-blue-500/30",
  shop_event: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  vacation:   "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  training:   "bg-violet-500/20 text-violet-500 border-violet-500/30",
  closed:     "bg-gray-500/20 text-gray-500 border-gray-500/30",
};

const emptyForm = { title: "", description: "", type: "day_off", date: new Date().toISOString().split("T")[0], end_date: "", renter_id: "" };

export default function TeamCalendar() {
  const [events, setEvents] = useState([]);
  const [renters, setRenters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const { t } = useLanguage();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const loadData = useCallback(async () => {
    const promises = [
      base44.entities.CalendarEvent.list("-date"),
      base44.entities.Renter.list(),
    ];
    if (isAdmin) promises.push(base44.entities.User.list());
    const [e, r, users] = await Promise.all(promises);
    setEvents(e);
    setRenters(r);
    if (users) setAllUsers(users);
    setLoading(false);
  }, [isAdmin]);
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

  // Birthday events: built from renters + all users (for admins)
  const renterBdays = renters
    .filter(r => r.birthday)
    .map(r => {
      const [, bMonth, bDay] = r.birthday.split("-");
      return { id: `bday-renter-${r.id}`, title: `🎂 ${r.name}`, bMonth: parseInt(bMonth), bDay: parseInt(bDay), isBirthday: true };
    });

  // For admins: collect birthdays from all user accounts
  // Avoid duplicates with renters (matched by user_email)
  const renterEmails = new Set(renters.map(r => r.user_email).filter(Boolean));
  const userBdays = isAdmin
    ? allUsers
        .filter(u => u.birthday && !renterEmails.has(u.email))
        .map(u => {
          const [, bMonth, bDay] = u.birthday.split("-");
          return { id: `bday-user-${u.id}`, title: `🎂 ${u.full_name}`, bMonth: parseInt(bMonth), bDay: parseInt(bDay), isBirthday: true };
        })
    : [];

  // For non-admins: include their own birthday if not covered by a renter record
  const selfBday = !isAdmin && user?.birthday && !renters.some(r => r.user_email === user.email && r.birthday)
    ? (() => {
        const [, bMonth, bDay] = user.birthday.split("-");
        return [{ id: `bday-me`, title: `🎂 ${user.full_name}`, bMonth: parseInt(bMonth), bDay: parseInt(bDay), isBirthday: true }];
      })()
    : [];

  const birthdayEvents = [...renterBdays, ...userBdays, ...selfBday];

  const getDayEvents = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const calEvents = monthEvents.filter(e => e.date === dateStr);
    const bdays = birthdayEvents.filter(b => b.bMonth === month + 1 && b.bDay === day);
    return [...calEvents, ...bdays];
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("scheduling") || "Scheduling"}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("calendar")}</h1>
          </div>
          <GoldButton onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />{t("addEvent") || "Add Event"}</GoldButton>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 hover:bg-muted rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-serif text-base font-medium">{monthLabel}</h2>
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 hover:bg-muted rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-border">
            {(t("weekDaysShort") ? t("weekDaysShort").split(",") : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map(d => (
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
                      <div key={e.id} className={cn(
                        "text-[9px] font-medium px-1 py-0.5 rounded truncate border",
                        e.isBirthday ? "bg-pink-500/20 text-pink-500 border-pink-500/30" : (TYPE_COLORS[e.type] || TYPE_COLORS.day_off)
                      )}>
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
        {(() => {
          const monthBdays = birthdayEvents.filter(b => b.bMonth === month + 1);
          const allMonthItems = [
            ...monthEvents.map(e => ({ ...e, sortKey: e.date })),
            ...monthBdays.map(b => ({ ...b, sortKey: `${year}-${String(month + 1).padStart(2,"0")}-${String(b.bDay).padStart(2,"0")}` })),
          ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
          if (!allMonthItems.length) return null;
          return (
            <div className="space-y-2">
              <h3 className="font-serif text-sm font-medium text-muted-foreground">{t("thisMonthEvents") || "This Month's Events"}</h3>
              {allMonthItems.map(e => (
                <div key={e.id} className="bg-card rounded-xl border border-border flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      e.isBirthday ? "bg-pink-500/20 text-pink-500 border-pink-500/30" : TYPE_COLORS[e.type]
                    )}>
                      {e.isBirthday ? "Birthday" : e.type.replace("_", " ")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.sortKey}{!e.isBirthday && e.renter_id && ` · ${renterMap[e.renter_id]?.name || ""}`}</p>
                    </div>
                  </div>
                  {!e.isBirthday && (
                    <button onClick={() => base44.entities.CalendarEvent.delete(e.id).then(loadData)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("addEvent") || "Add Calendar Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder={`${t("title") || "Title"} *`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="callout">{t("callout") || "Callout"}</SelectItem>
                <SelectItem value="day_off">{t("dayOff") || "Day Off"}</SelectItem>
                <SelectItem value="shop_event">{t("shopEvent") || "Shop Event"}</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="closed">Salon Closed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Select value={form.renter_id} onValueChange={v => setForm(f => ({ ...f, renter_id: v }))}>
              <SelectTrigger><SelectValue placeholder={`${t("stylists")} (${t("optional") || "optional"})`} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{t("allStylists") || "All / Shop"}</SelectItem>
                {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder={`${t("description") || "Description"} (${t("optional") || "optional"})`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.title || !form.date}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}