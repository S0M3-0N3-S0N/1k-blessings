import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { QRCodeSVG } from "qrcode.react";
import { Search, Link2, Copy, Check, X, UserCheck, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export default function UserLinker({ renter, onLinked }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("search");

  useEffect(() => {
    base44.entities.User.list().then(u => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleSelect = async (user) => {
    setSaving(true);
    await base44.entities.Renter.update(renter.id, { user_email: user.email });
    setSaving(false);
    onLinked(user.email);
  };

  const handleUnlink = async () => {
    setSaving(true);
    await base44.entities.Renter.update(renter.id, { user_email: "" });
    setSaving(false);
    onLinked("");
  };

  const inviteLink = `${window.location.origin}?link_renter=${renter.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Status pill */}
      {renter.user_email ? (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5">
          <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t("linked")}</p>
            <p className="text-xs text-muted-foreground truncate">{renter.user_email}</p>
          </div>
          <button
            onClick={handleUnlink}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-muted/30 border border-dashed border-border rounded-xl px-3 py-2.5">
          <Users className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <p className="text-xs text-muted-foreground">{t("notLinked")}</p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {[
          { key: "search", label: t("searchUsers") },
          { key: "invite", label: t("inviteLink") },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("searchByNameOrEmail")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-muted/30"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("noUsersFound")}</p>
            ) : (
              filtered.map(u => {
                const isLinked = u.email === renter.user_email;
                const initials = u.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <button
                    key={u.id}
                    onClick={() => !isLinked && handleSelect(u)}
                    disabled={saving || isLinked}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isLinked ? "bg-emerald-500/5 cursor-default" : "hover:bg-muted/40 active:bg-muted/60"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {isLinked ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 shrink-0">{t("linked")}</span>
                    ) : saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    ) : (
                      <span className="text-[10px] font-semibold text-primary shrink-0">{t("select")}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Invite link tab */}
      {tab === "invite" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("inviteLinkDesc").replace("{name}", renter.name)}
          </p>
          <div className="flex justify-center py-2">
            <div className="p-3 bg-white rounded-xl border border-border">
              <QRCodeSVG value={inviteLink} size={140} />
            </div>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-2 overflow-hidden">
            <div className="flex items-start gap-2">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground font-mono break-all leading-relaxed flex-1 min-w-0">{inviteLink}</p>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px]",
                copied
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
              )}
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5" /> {t("copied")}</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> {t("copy")}</>
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{t("inviteLinkNote")}</p>
        </div>
      )}
    </div>
  );
}