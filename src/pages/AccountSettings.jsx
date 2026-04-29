import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GoldButton from "@/components/ui/GoldButton.jsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Loader2, Moon, Sun, Trash2, LogOut, Download, Smartphone, HelpCircle, Pencil, Check, X } from "lucide-react";
import InstallSlideshow from "@/components/InstallSlideshow";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function AccountSettings() {
  const { user } = useAuth();
  const { t, lang, setLanguage, LANGUAGES } = useLanguage();
  const { toast } = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("1kb-theme") || "dark");
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("1kb-accent") || "gold");

  const ACCENTS = [
    { id: "gold",   label: "Gold",   hsl: "43 72% 42%" },
    { id: "rose",   label: "Rose",   hsl: "346 77% 49%" },
    { id: "violet", label: "Violet", hsl: "262 83% 58%" },
    { id: "teal",   label: "Teal",   hsl: "174 72% 38%" },
    { id: "sky",    label: "Sky",    hsl: "199 89% 48%" },
    { id: "slate",  label: "Slate",  hsl: "215 25% 40%" },
  ];

  const applyAccent = (id) => {
    const found = ACCENTS.find(a => a.id === id);
    if (!found) return;
    setAccentColor(id);
    localStorage.setItem("1kb-accent", id);
    document.documentElement.style.setProperty("--primary", found.hsl);
    document.documentElement.style.setProperty("--ring", found.hsl);
    document.documentElement.style.setProperty("--gold", found.hsl);
  };

  useEffect(() => {
    const saved = localStorage.getItem("1kb-accent");
    if (saved) applyAccent(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [saving, setSaving] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", birthday: "" });

  useEffect(() => {
    if (user) setProfileForm({ full_name: user.full_name || "", phone: user.phone || "", birthday: user.birthday || "" });
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast({ title: "App added to home screen!" });
    }
  };

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("1kb-theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await base44.auth.updateMe({ full_name: profileForm.full_name, phone: profileForm.phone, birthday: profileForm.birthday });
    toast({ title: t("settingsSaved") });
    setEditingProfile(false);
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    toast({ title: t("settingsSaved") });
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("account")}</p>
        <h1 className="font-serif text-3xl font-light tracking-wide">{t("accountSettings")}</h1>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-medium">{t("profileInfo")}</h2>
          {!editingProfile ? (
            <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Pencil className="w-3.5 h-3.5" /> {t("edit")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditingProfile(false); setProfileForm({ full_name: user?.full_name || "", phone: user?.phone || "" }); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" /> {t("cancel")}
              </button>
              <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {t("save")}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("fullName")}</label>
            {editingProfile ? (
              <Input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} className="min-h-[44px]" />
            ) : (
              <Input value={user?.full_name || ""} disabled className="bg-muted/30 min-h-[44px]" />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("phone")}</label>
            {editingProfile ? (
              <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="min-h-[44px]" />
            ) : (
              <Input value={user?.phone || ""} disabled className="bg-muted/30 min-h-[44px]" placeholder="—" />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">🎂 {t("birthday") || "Birthday"}</label>
            {editingProfile ? (
              <Input type="date" value={profileForm.birthday} onChange={e => setProfileForm(f => ({ ...f, birthday: e.target.value }))} className="min-h-[44px]" />
            ) : (
              <Input value={user?.birthday || ""} disabled className="bg-muted/30 min-h-[44px]" placeholder="—" />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("email")}</label>
            <Input value={user?.email || ""} disabled className="bg-muted/30 min-h-[44px]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("role")}</label>
            <Input value={user?.role || ""} disabled className="bg-muted/30 capitalize min-h-[44px]" />
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-serif text-base font-medium">{t("language")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[64px] relative",
                lang === l.code
                  ? "border-primary bg-primary/8 text-foreground"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <span className="text-2xl">{l.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{l.native}</p>

              </div>
              {lang === l.code && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-serif text-base font-medium">{t("appearance")}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => applyTheme("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg border text-sm font-medium transition-all",
              theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            <Sun className="w-4 h-4" /> {t("light")}
          </button>
          <button
            onClick={() => applyTheme("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg border text-sm font-medium transition-all",
              theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            <Moon className="w-4 h-4" /> {t("dark")}
          </button>
        </div>

        {/* Accent color */}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Accent Color</p>
          <div className="grid grid-cols-6 gap-2">
            {ACCENTS.map(a => (
              <button
                key={a.id}
                onClick={() => applyAccent(a.id)}
                title={a.label}
                className={cn(
                  "w-full aspect-square rounded-xl border-2 transition-all flex items-center justify-center",
                  accentColor === a.id ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ background: `hsl(${a.hsl})` }}
              >
                {accentColor === a.id && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {ACCENTS.find(a => a.id === accentColor)?.label}
          </p>
        </div>
      </div>

      {/* Install App */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium">Add to Home Screen</h2>
              <p className="text-xs text-muted-foreground">Install the app for quick access from your phone.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSlideshow(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" /> How?
          </button>
        </div>
        {isInstalled ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
            ✓ App is already installed on this device
          </div>
        ) : installPrompt ? (
          <Button
            onClick={handleInstall}
            className="w-full min-h-[44px] gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" /> Install App
          </Button>
        ) : (
          <button
            onClick={() => setShowSlideshow(true)}
            className="w-full min-h-[44px] rounded-lg border border-dashed border-primary/40 text-sm text-primary font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" /> View Installation Guide
          </button>
        )}
      </div>

      <InstallSlideshow open={showSlideshow} onClose={() => setShowSlideshow(false)} />

      <GoldButton onClick={handleSave} disabled={saving} className="w-full min-h-[44px]">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveSettings")}
      </GoldButton>

      <Button
        variant="outline"
        className="w-full min-h-[44px] gap-2"
        onClick={() => base44.auth.logout()}
      >
        <LogOut className="w-4 h-4" /> {t("signOut")}
      </Button>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/30 p-5 space-y-3">
        <h2 className="font-serif text-base font-medium text-destructive">{t("dangerZone")}</h2>
        <p className="text-xs text-muted-foreground">{t("deleteAccountDesc")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full min-h-[44px] gap-2">
              <Trash2 className="w-4 h-4" /> {t("deleteAccount")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteAccountConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteAccountDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              >
                {t("yesDelete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}