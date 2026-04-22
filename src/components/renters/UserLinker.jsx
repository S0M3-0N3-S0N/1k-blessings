import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Link2, Copy, Check, X, UserCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UserLinker({ renter, onLinked }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("search"); // "search" | "invite"

  useEffect(() => {
    base44.entities.User.list().then(u => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
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

  // Invite link — encodes the renter ID so the stylist can self-link on login
  const inviteLink = `${window.location.origin}?link_renter=${renter.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Current link status */}
      {renter.user_email ? (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Linked</p>
              <p className="text-xs text-muted-foreground">{renter.user_email}</p>
            </div>
          </div>
          <button
            onClick={handleUnlink}
            disabled={saving}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
          Not linked — choose a method below to connect a user account.
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
        {[{ key: "search", label: "Search Users" }, { key: "invite", label: "Invite Link" }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
              tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No users found</p>
            ) : (
              filtered.map(u => {
                const isLinked = u.email === renter.user_email;
                return (
                  <button
                    key={u.id}
                    onClick={() => !isLinked && handleSelect(u)}
                    disabled={saving || isLinked}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-colors min-h-[44px]",
                      isLinked
                        ? "bg-emerald-500/8 cursor-default"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {isLinked ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Linked</span>
                    ) : saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100">Select</span>
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
          <p className="text-xs text-muted-foreground">
            Share this link with <strong>{renter.name}</strong>. When they open it and log in, their account will automatically be linked to this stylist profile.
          </p>
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground font-mono truncate flex-1">{inviteLink}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            This link contains the stylist profile ID. It does not expire, but can be re-generated by updating the stylist.
          </p>
        </div>
      )}
    </div>
  );
}