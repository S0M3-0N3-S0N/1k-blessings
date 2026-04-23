import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, Trash2, Pencil, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import GoldButton from "@/components/ui/GoldButton.jsx";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

const CAT_CONFIG = {
general:  { className: "bg-muted text-muted-foreground border-border" },
reminder: { className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
policy:   { className: "bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30" },
goal:     { className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};

const emptyForm = { content: "", category: "general", pinned: false };

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadData = useCallback(async () => {
    const n = await base44.entities.SalonNote.list("-created_date");
    setNotes(n); setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setForm(emptyForm); setEditNote(null); setShowDialog(true); };
  const openEdit = (n) => { setForm({ content: n.content, category: n.category || "general", pinned: n.pinned || false }); setEditNote(n); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    if (editNote) {
      await base44.entities.SalonNote.update(editNote.id, form);
      toast({ title: t("edit") });
    } else {
      await base44.entities.SalonNote.create(form);
      toast({ title: t("addNote") });
    }
    setShowDialog(false); setSaving(false); loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.SalonNote.delete(id);
    toast({ title: t("delete") }); loadData();
  };

  const togglePin = async (note) => {
    await base44.entities.SalonNote.update(note.id, { pinned: !note.pinned });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const filtered = notes
    .filter(n => filterCat === "all" || n.category === filterCat)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("owner")}</p>
            <h1 className="font-serif text-3xl font-light tracking-wide">{t("salonNotes")}</h1>
          </div>
          <GoldButton onClick={openAdd}><Plus className="w-4 h-4" />{t("addNote")}</GoldButton>
        </div>

        {/* Category Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", "general", "reminder", "policy", "goal"].map(f => (
            <button key={f} onClick={() => setFilterCat(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors min-h-[44px]", filterCat === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f === "all" ? t("all") || "All" : t(f)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">{t("noNotes") || "No notes yet. Add reminders, policies, or goals here."}</p>
            <button onClick={openAdd} className="text-xs text-primary hover:underline">{t("addNote")} →</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(n => {
              const cat = CAT_CONFIG[n.category] || CAT_CONFIG.general;
              return (
                <div key={n.id} className={cn("bg-card rounded-xl border border-border p-4 flex flex-col gap-3 relative", n.pinned && "ring-1 ring-primary/30")}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", cat.className)}>
                      {n.pinned && "📌 "}{t(n.category)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePin(n)} className={cn("p-1.5 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors", n.pinned && "text-primary")}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed flex-1 whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {n.created_date ? new Date(n.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editNote ? t("edit") : t("addNote")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(CAT_CONFIG).map(v => <SelectItem key={v} value={v}>{t(v)}</SelectItem>)}
              </SelectContent>
            </Select>
            <textarea
              placeholder={`${t("notes")} *`}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full min-h-[120px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <Switch checked={form.pinned} onCheckedChange={v => setForm(f => ({ ...f, pinned: v }))} id="pin-toggle" />
              <label htmlFor="pin-toggle" className="text-sm text-muted-foreground cursor-pointer">{t("pinned")}</label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowDialog(false)}>{t("cancel")}</Button>
              <GoldButton className="flex-1" onClick={handleSave} disabled={saving || !form.content.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}