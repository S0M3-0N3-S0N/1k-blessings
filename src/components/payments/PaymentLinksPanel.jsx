import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUpRight, Copy, Check } from "lucide-react";

const METHOD_META = {
  cashapp: {
    label: "Cash App",
    sub: "Send via $CashTag",
    bgCard: "bg-[#00D64F]",
    textCard: "text-white",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.2)"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">$</text>
      </svg>
    ),
  },
  venmo: {
    label: "Venmo",
    sub: "Send via @handle",
    bgCard: "bg-[#008CFF]",
    textCard: "text-white",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.2)"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">V</text>
      </svg>
    ),
  },
  zelle: {
    label: "Zelle",
    sub: "Send to phone/email",
    bgCard: "bg-[#6D1ED4]",
    textCard: "text-white",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.2)"/>
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">Z</text>
      </svg>
    ),
  },
  applepay: {
    label: "Apple Pay",
    sub: "Tap to pay",
    bgCard: "bg-zinc-900 dark:bg-zinc-800",
    textCard: "text-white",
    logo: (
      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
        <span className="text-white font-bold text-[10px] leading-none"> Pay</span>
      </div>
    ),
  },
  googlepay: {
    label: "Google Pay",
    sub: "Tap to pay",
    bgCard: "bg-white border border-gray-200",
    textCard: "text-gray-800",
    logo: (
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
        <span className="font-bold text-sm" style={{background:"linear-gradient(135deg,#4285F4,#EA4335,#FBBC04,#34A853)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>G</span>
      </div>
    ),
  },
};

export default function PaymentLinksPanel({ renter, amount }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    base44.entities.SalonNote.filter({ title: "__payment_settings__" }).then(res => {
      if (res[0]?.content) {
        try { setSettings(JSON.parse(res[0].content)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

  if (!settings) return (
    <div className="text-center py-8 space-y-1">
      <p className="text-sm font-medium">Not configured yet</p>
      <p className="text-xs text-muted-foreground">Ask the salon owner to set up payment links.</p>
    </div>
  );

  const amtFormatted = amount ? amount.toFixed(2) : "";
  const note = `Rent from ${renter?.name || "Stylist"}`;
  const noteEnc = encodeURIComponent(note);

  const methods = [
    settings.cashapp_handle && {
      key: "cashapp",
      handle: settings.cashapp_handle,
      url: `https://cash.app/$${settings.cashapp_handle.replace(/^\$/, "")}/${amtFormatted}`,
    },
    settings.venmo_handle && {
      key: "venmo",
      handle: settings.venmo_handle,
      // Use the venmo:// deep link scheme for mobile; falls back to web
      url: `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(settings.venmo_handle.replace(/^@/, ""))}&amount=${amtFormatted}&note=${noteEnc}`,
      fallbackUrl: `https://venmo.com/${settings.venmo_handle.replace(/^@/, "")}`,
    },
    settings.zelle_handle && {
      key: "zelle",
      handle: settings.zelle_handle,
      url: `https://enroll.zellepay.com/`,
    },
    settings.applepay_handle && {
      key: "applepay",
      handle: settings.applepay_handle,
      // Apple Pay P2P has no public web deep link — open Wallet app
      url: `shoebox://`,
      copyHandle: true,
    },
    settings.googlepay_handle && {
      key: "googlepay",
      handle: settings.googlepay_handle,
      url: `https://pay.google.com/`,
    },
  ].filter(Boolean);

  if (methods.length === 0) return (
    <div className="text-center py-8 text-sm text-muted-foreground">No payment methods configured yet.</div>
  );

  return (
    <div className="space-y-4">
      {/* Amount header */}
      {amount > 0 && (
        <div className="bg-primary/10 rounded-xl px-5 py-4 text-center border border-primary/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Amount Due</p>
          <p className="font-mono text-4xl font-bold text-primary tracking-tight">{formatCurrency(amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Weekly rent · {renter?.frequency || ""}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center font-medium">Choose how you'd like to pay</p>

      {/* Payment method cards — 2 col grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {methods.map(m => {
          const meta = METHOD_META[m.key];
          if (m.copyHandle) {
            // Apple Pay: show handle to copy + open Wallet
            return (
              <div key={m.key} className={`relative flex flex-col gap-3 p-4 rounded-2xl ${meta.bgCard} ${meta.textCard} shadow-sm`}>
                <div className="flex items-start justify-between">
                  {meta.logo}
                  <button
                    onClick={() => handleCopy(m.handle, m.key)}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {copied === m.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{meta.label}</p>
                  <p className="text-[11px] opacity-70 mt-0.5 truncate">{m.handle}</p>
                  <p className="text-[10px] opacity-50 mt-1">Tap copy, then open Wallet</p>
                </div>
              </div>
            );
          }
          return (
            <a
              key={m.key}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative flex flex-col gap-3 p-4 rounded-2xl transition-all active:scale-95 ${meta.bgCard} ${meta.textCard} shadow-sm hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                {meta.logo}
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{meta.label}</p>
                <p className="text-[11px] opacity-70 mt-0.5 truncate">{m.handle}</p>
              </div>
            </a>
          );
        })}
      </div>

      {settings.payment_note && (
        <div className="bg-muted/40 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">💬 {settings.payment_note}</p>
        </div>
      )}
    </div>
  );
}