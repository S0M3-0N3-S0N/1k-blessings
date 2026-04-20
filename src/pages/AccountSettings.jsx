import { useState } from "react";
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
import { Loader2, Moon, Sun, Trash2, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function AccountSettings() {
  const { user } = useAuth();
  const { t, lang, setLanguage, LANGUAGES } = useLanguage();
  const { toast } = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("1kb-theme") || "dark");
  const [saving, setSaving] = useState(false);

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("1kb-theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
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
        <h2 className="font-serif text-base font-medium">{t("profileInfo")}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{t("fullName")}</label>
            <Input value={user?.full_name || ""} disabled className="bg-muted/30 min-h-[44px]" />
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
      </div>

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