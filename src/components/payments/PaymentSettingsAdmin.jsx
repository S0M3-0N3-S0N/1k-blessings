import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT = {
  cashapp_handle: "",
  venmo_handle: "",
  zelle_handle: "",
  applepay_handle: "",
  googlepay_handle: "",
  payment_note: "",
};

export default function PaymentSettingsAdmin() {
  const [form, setForm] = useState(DEFAULT);
  const [noteId, setNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.SalonNote.filter({ title: "__payment_settings__" }).then(res => {
      if (res[0]) {
        setNoteId(res[0].id);
        try { setForm({ ...DEFAULT, ...JSON.parse(res[0].content) }); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const content = JSON.stringify(form);
    if (noteId) {
      await base44.entities.SalonNote.update(noteId, { content });
    } else {
      const created = await base44.entities.SalonNote.create({
        title: "__payment_settings__",
        content,
        category: "general",
        pinned: false,
      });
      setNoteId(created.id);
    }
    toast({ title: "Payment settings saved" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;

  const fields = [
    { key: "cashapp_handle", label: "Cash App Handle", placeholder: "$YourCashTag" },
    { key: "venmo_handle", label: "Venmo Handle", placeholder: "@YourVenmo" },
    { key: "zelle_handle", label: "Zelle (phone or email)", placeholder: "+1 (555) 000-0000" },
    { key: "applepay_handle", label: "Apple Pay (phone or email)", placeholder: "+1 (555) 000-0000" },
    { key: "googlepay_handle", label: "Google Pay (phone or UPI)", placeholder: "your@gmail.com" },
    { key: "payment_note", label: "Payment Note (optional)", placeholder: "e.g. Include your name in the memo" },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-base font-medium">Payment Links</h2>
          <p className="text-xs text-muted-foreground">Renters will see these buttons to pay their rent.</p>
        </div>
      </div>
      <div className="space-y-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{f.label}</label>
            <Input
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="min-h-[44px]"
            />
          </div>
        ))}
      </div>
      <GoldButton onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Payment Settings"}
      </GoldButton>
    </div>
  );
}