import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GoldButton from "@/components/ui/GoldButton.jsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("1kb-theme") || "dark");
  const [saving, setSaving] = useState(false);

  const applyTheme = (t) => {
    setTheme(t);
    localStorage.setItem("1kb-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSave = async () => {
    setSaving(true);
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">Account</p>
        <h1 className="font-serif text-3xl font-light tracking-wide">Account Settings</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-serif text-base font-medium">Profile Info</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Full Name</label>
            <Input value={user?.full_name || ""} disabled className="bg-muted/30 min-h-[44px]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email</label>
            <Input value={user?.email || ""} disabled className="bg-muted/30 min-h-[44px]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Role</label>
            <Input value={user?.role || ""} disabled className="bg-muted/30 capitalize min-h-[44px]" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-serif text-base font-medium">Appearance</h2>
        <div className="flex gap-2">
          <button
            onClick={() => applyTheme("light")}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg border text-sm font-medium transition-all ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
          <button
            onClick={() => applyTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg border text-sm font-medium transition-all ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>
        </div>
      </div>

      <GoldButton onClick={handleSave} disabled={saving} className="w-full min-h-[44px]">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}
      </GoldButton>

      {/* Danger zone */}
      <div className="bg-card rounded-xl border border-destructive/30 p-5 space-y-3">
        <h2 className="font-serif text-base font-medium text-destructive">Danger Zone</h2>
        <p className="text-xs text-muted-foreground">Permanently delete your account. This cannot be undone.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full min-h-[44px] gap-2">
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and sign you out. You will lose access to 1k Blessings. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]">
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}