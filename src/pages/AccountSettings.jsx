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
  const [accentHue, setAccentHue] = useState(() => parseInt(localStorage.getItem("1kb-accent-hue") || "43"));

  const applyAccentHue = (hue) => {
    const h = parseInt(hue);
    setAccentHue(h);
    localStorage.setItem("1kb-accent-hue", String(h));
    document.documentElement.style.setProperty("--accent-h", String(h));
  };

  useEffect(() => {
    const saved = localStorage.getItem("1kb-accent-hue");
    if (saved) document.documentElement.style.setProperty("--accent-h", saved);
  }, []);

  const hueToName = (h) => {
    if (h < 15 || h >= 345) return "Red";
    if (h < 45) return "Orange";
    if (h < 65) return "Yellow";
    if (h < 150) return "Green";
    if (h < 195) return "Teal";
    if (h < 255) return "Blue";
    if (h < 285) return "Violet";
    if (h < 315) return "Purple";
    return "Pink";
  };
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium">Accent Color</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-border shadow-sm" style={{ background: `hsl(${accentHue} 72% 42%)` }} />
              <span className="text-xs font-semibold" style={{ color: `hsl(${accentHue} 72% 42%)` }}>{hueToName(accentHue)}</span>
            </div>
          </div>
          {/* Color wheel slider */}
          <div className="relative">
            <div
              className="w-full h-8 rounded-xl border border-border shadow-inner"
              style={{
                background: "linear-gradient(to right, hsl(0,72%,42%), hsl(30,72%,42%), hsl(60,72%,42%), hsl(90,72%,42%), hsl(120,72%,42%), hsl(150,72%,42%), hsl(180,72%,42%), hsl(210,72%,42%), hsl(240,72%,42%), hsl(270,72%,42%), hsl(300,72%,42%), hsl(330,72%,42%), hsl(360,72%,42%))"
              }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={accentHue}
              onChange={e => applyAccentHue(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ margin: 0 }}
            />
            {/* Thumb indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `calc(${(accentHue / 360) * 100}% - 12px)`,
                background: `hsl(${accentHue} 72% 42%)`
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Drag to pick any color</p>
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