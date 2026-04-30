import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT = {
  cashapp_handle: "",
  venmo_handle: "",
  zelle_handle: "",
  applepay_handle: "",
  googlepay_handle: "",
  payment_note: "",
};

const METHODS = [
  {
    key: "cashapp_handle",
    name: "Cash App",
    placeholder: "$YourCashTag",
    color: "#00D64F",
    bg: "bg-[#00D64F]",
    logo: (
      <svg viewBox="0 0 36 36" className="w-5 h-5" fill="none">
        <rect width="36" height="36" rx="8" fill="#00D64F"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">$</text>
      </svg>
    ),
  },
  {
    key: "venmo_handle",
    name: "Venmo",
    placeholder: "@YourVenmo",
    color: "#008CFF",
    bg: "bg-[#008CFF]",
    logo: (
      <svg viewBox="0 0 36 36" className="w-5 h-5" fill="none">
        <rect width="36" height="36" rx="8" fill="#008CFF"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">V</text>
      </svg>
    ),
  },
  {
    key: "zelle_handle",
    name: "Zelle",
    placeholder: "Phone or email",
    color: "#6D1ED4",
    bg: "bg-[#6D1ED4]",
    logo: (
      <svg viewBox="0 0 36 36" className="w-5 h-5" fill="none">
        <rect width="36" height="36" rx="8" fill="#6D1ED4"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">Z</text>
      </svg>
    ),
  },
  {
    key: "applepay_handle",
    name: "Apple Pay",
    placeholder: "Phone or email",
    color: "#000000",
    bg: "bg-black",
    logo: (
      <div className="w-5 h-5 rounded-md bg-black flex items-center justify-center">
        <span className="text-white text-[8px] font-bold leading-none"> Pay</span>
      </div>
    ),
  },
  {
    key: "googlepay_handle",
    name: "Google Pay",
    placeholder: "Phone or Gmail",
    color: "#4285F4",
    bg: "bg-white border border-gray-200",
    logo: (
      <div className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center">
        <span className="text-[9px] font-bold" style={{background:"linear-gradient(90deg,#4285F4,#EA4335,#FBBC04,#34A853)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>G</span>
      </div>
    ),
  },
];

export default function PaymentSettingsAdmin() {
  const [form, setForm] = useState(DEFAULT);
  const [noteId, setNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast({ title: "Payment settings saved" });
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Rent Collection</p>
        <h2 className="font-serif text-base font-medium mt-0.5">Payment Links</h2>
        <p className="text-xs text-muted-foreground mt-1">Add your handles so renters can tap to pay directly from their dashboard.</p>
      </div>

      {/* Method rows */}
      <div className="divide-y divide-border">
        {METHODS.map(m => {
          const val = form[m.key];
          const hasValue = !!val?.trim();
          return (
            <div key={m.key} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-muted">
                {m.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-1.5">{m.name}</p>
                <Input
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [m.key]: e.target.value }))}
                  placeholder={m.placeholder}
                  className="h-8 text-xs"
                />
              </div>
              {hasValue && (
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
              )}
            </div>
          );
        })}
        <div className="px-5 py-3.5">
          <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Custom Note (optional)</p>
          <Input
            value={form.payment_note}
            onChange={e => setForm(p => ({ ...p, payment_note: e.target.value }))}
            placeholder='e.g. "Include your name in the memo"'
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border bg-muted/20">
        <GoldButton onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Payment Settings"}
        </GoldButton>
      </div>
    </div>
  );
}