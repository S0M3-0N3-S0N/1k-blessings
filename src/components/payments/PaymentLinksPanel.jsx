import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";

// SVG icons for each payment method
const CashAppIcon = () => (
  <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
    <rect width="40" height="40" rx="10" fill="#00D64F"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">$</text>
  </svg>
);
const ZelleIcon = () => (
  <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
    <rect width="40" height="40" rx="10" fill="#6D1ED4"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Z</text>
  </svg>
);
const VenmoIcon = () => (
  <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
    <rect width="40" height="40" rx="10" fill="#008CFF"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">V</text>
  </svg>
);
const ApplePayIcon = () => (
  <svg viewBox="0 0 50 20" className="h-5" fill="currentColor">
    <text x="0" y="16" fontSize="14" fontFamily="-apple-system, sans-serif" fontWeight="600"> Pay</text>
  </svg>
);
const GooglePayIcon = () => (
  <svg viewBox="0 0 60 24" className="h-5">
    <text x="0" y="18" fontSize="14" fontFamily="sans-serif" fontWeight="500" fill="currentColor">G Pay</text>
  </svg>
);

export default function PaymentLinksPanel({ renter, amount }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load payment settings from a well-known SalonNote used as config store
    base44.entities.SalonNote.filter({ title: "__payment_settings__" }).then(res => {
      if (res[0]?.content) {
        try { setSettings(JSON.parse(res[0].content)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  if (!settings) return (
    <div className="text-center py-4 text-sm text-muted-foreground">
      Payment links not configured yet. Ask the salon owner to set them up.
    </div>
  );

  const amtFormatted = amount ? amount.toFixed(2) : "";
  const note = `Rent%20from%20${encodeURIComponent(renter?.name || "Stylist")}`;

  const methods = [
    settings.cashapp_handle && {
      key: "cashapp",
      label: "Cash App",
      icon: <CashAppIcon />,
      bg: "bg-[#00D64F]/10 hover:bg-[#00D64F]/20 border-[#00D64F]/30",
      textColor: "text-[#00D64F]",
      url: `https://cash.app/$${settings.cashapp_handle.replace(/^\$/, "")}/${amtFormatted}`,
    },
    settings.venmo_handle && {
      key: "venmo",
      label: "Venmo",
      icon: <VenmoIcon />,
      bg: "bg-[#008CFF]/10 hover:bg-[#008CFF]/20 border-[#008CFF]/30",
      textColor: "text-[#008CFF]",
      url: `https://venmo.com/${settings.venmo_handle.replace(/^@/, "")}?txn=pay&amount=${amtFormatted}&note=${note}`,
    },
    settings.zelle_handle && {
      key: "zelle",
      label: "Zelle",
      icon: <ZelleIcon />,
      bg: "bg-[#6D1ED4]/10 hover:bg-[#6D1ED4]/20 border-[#6D1ED4]/30",
      textColor: "text-[#6D1ED4]",
      url: `https://enroll.zellepay.com/qr-codes?data=${encodeURIComponent(JSON.stringify({ name: settings.zelle_handle, token: settings.zelle_handle, action: "pay" }))}`,
    },
    settings.applepay_handle && {
      key: "applepay",
      label: "Apple Pay",
      icon: null,
      isApple: true,
      bg: "bg-black/10 hover:bg-black/15 border-black/20 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20",
      textColor: "text-foreground",
      url: `https://applepay.apple.com/`,
      note: settings.applepay_handle,
    },
    settings.googlepay_handle && {
      key: "googlepay",
      label: "Google Pay",
      icon: null,
      isGoogle: true,
      bg: "bg-muted hover:bg-muted/80 border-border",
      textColor: "text-foreground",
      url: `https://pay.google.com/payments/home`,
      note: settings.googlepay_handle,
    },
  ].filter(Boolean);

  if (methods.length === 0) return (
    <div className="text-center py-4 text-sm text-muted-foreground">
      No payment methods configured yet.
    </div>
  );

  return (
    <div className="space-y-3">
      {amount > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Amount due</p>
          <p className="font-mono text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">Tap a method below to pay</p>
      <div className="grid gap-2">
        {methods.map(m => (
          <a
            key={m.key}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all min-h-[56px] ${m.bg}`}
          >
            <div className="flex items-center gap-3">
              {m.isApple ? (
                <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-black font-semibold text-xs"> Pay</span>
                </div>
              ) : m.isGoogle ? (
                <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
                  <span className="font-bold text-xs" style={{background:"linear-gradient(90deg,#4285F4,#EA4335,#FBBC04,#34A853)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>G</span>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {m.icon}
                </div>
              )}
              <div>
                <p className={`font-semibold text-sm ${m.textColor}`}>{m.label}</p>
                {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
      {settings.payment_note && (
        <p className="text-xs text-muted-foreground text-center pt-1 italic">{settings.payment_note}</p>
      )}
    </div>
  );
}