import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Trash2, LogOut, Camera, Moon, Sun, Monitor, Bell, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RECENT_ACTIVITY = [
  { device: "iPhone 15 Pro", location: "Atlanta, GA", time: "Today, 9:14 AM", current: true },
  { device: "MacBook Pro", location: "Atlanta, GA", time: "Yesterday, 6:42 PM", current: false },
  { device: "iPhone 15 Pro", location: "Atlanta, GA", time: "Apr 6, 8:01 AM", current: false },
];

export default function AccountSettings() {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState({
    new_message: true,
    paystub_ready: true,
    payment_due: true,
    schedule_change: false,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user?.profile_picture) setProfilePic(user.profile_picture);
    if (user?.theme_preference) setTheme(user.theme_preference);
    if (user?.notifications) setNotifications({ ...notifications, ...user.notifications });
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      root.classList.toggle("dark", mq.matches);
    }
  }, [theme]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProfilePic(file_url);
    await base44.auth.updateMe({ profile_picture: file_url });
    toast.success("Profile picture updated");
    setUploadingAvatar(false);
  };

  const handleThemeChange = async (val) => {
    setTheme(val);
    await base44.auth.updateMe({ theme_preference: val });
  };

  const handleNotifToggle = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setSavingNotifs(true);
    await base44.auth.updateMe({ notifications: updated });
    setSavingNotifs(false);
  };

  const handleLogout = () => base44.auth.logout();
  const handleDeleteAccount = async () => {
    setDeleting(true);
    await base44.auth.logout("/");
  };

  const themeOptions = [
    { value: "dark", label: "Black & Gold", icon: Moon },
    { value: "light", label: "Minimal White", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

  const notifItems = [
    { key: "new_message", label: "New message received", sub: "Get alerted when someone messages you" },
    { key: "paystub_ready", label: "Paystub ready", sub: "Notified when your weekly paystub is generated" },
    { key: "payment_due", label: "Payment due reminder", sub: "Reminder before rent is due" },
    { key: "schedule_change", label: "Schedule changes", sub: "Alerts for calendar updates" },
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight">Account & Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your identity, security, and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 overflow-hidden flex items-center justify-center">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary/60" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" /> : <Camera className="w-3.5 h-3.5 text-primary-foreground" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-semibold text-base">{user?.full_name || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className={cn("inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
              user?.role === "admin" ? "bg-primary/20 text-primary" : "bg-indigo-500/15 text-indigo-400")}>
              {user?.role || "user"}
            </span>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-3">Choose your preferred theme</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={cn(
                  "flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border text-xs font-medium transition-all",
                  theme === value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                )}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</h3>
          {savingNotifs && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="divide-y divide-border">
          {notifItems.map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={() => handleNotifToggle(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Security / Recent Activity */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {RECENT_ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{a.device}</p>
                  {a.current && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.location}</p>
              </div>
              <p className="text-xs text-muted-foreground">{a.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium">Sign Out</p>
            <p className="text-xs text-muted-foreground">Log out of your account</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/30">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account. Please contact support to finalize account deletion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? "Processing..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        For support, contact us at support@1kblessings.com
      </p>
    </div>
  );
}