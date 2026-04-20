import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Scissors, BarChart2, Receipt, Calendar, Settings, LogOut,
  Sparkles, ChevronLeft, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";



const slideVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function Layout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const adminNav = [
    { path: "/", label: t("dashboard"), icon: LayoutDashboard },
    { path: "/renters", label: t("stylists"), icon: Users },
    { path: "/payments", label: t("payments"), icon: CreditCard },
    { path: "/services", label: t("services"), icon: Scissors },
    { path: "/reports", label: t("reports"), icon: BarChart2 },
    { path: "/expenses", label: t("expenses"), icon: Receipt },
    { path: "/notes", label: t("notes"), icon: StickyNote },
    { path: "/messages", label: t("messages"), icon: MessageSquare },
    { path: "/calendar", label: t("calendar"), icon: Calendar },
    { path: "/account", label: t("account"), icon: Settings },
  ];

  const renterNav = [
    { path: "/", label: t("dashboard"), icon: LayoutDashboard },
    { path: "/paystub", label: t("paystub"), icon: Receipt },
    { path: "/services", label: t("services"), icon: Scissors },
    { path: "/messages", label: t("messages"), icon: MessageSquare },
    { path: "/calendar", label: t("calendar"), icon: Calendar },
    { path: "/account", label: t("account"), icon: Settings },
  ];

  const adminBottomTabs = [
    { path: "/", label: t("dashboard"), icon: LayoutDashboard },
    { path: "/renters", label: t("stylists"), icon: Users },
    { path: "/payments", label: t("payments"), icon: CreditCard },
    { path: "/services", label: t("services"), icon: Scissors },
    { path: "/messages", label: t("messages"), icon: MessageSquare },
  ];

  const renterBottomTabs = [
    { path: "/", label: t("dashboard"), icon: LayoutDashboard },
    { path: "/services", label: t("services"), icon: Scissors },
    { path: "/paystub", label: t("paystub"), icon: Receipt },
    { path: "/messages", label: t("messages"), icon: MessageSquare },
    { path: "/account", label: t("account"), icon: Settings },
  ];

  const nav = isAdmin ? adminNav : renterNav;
  const bottomTabs = isAdmin ? adminBottomTabs : renterBottomTabs;
  const canGoBack = window.history.length > 1 && location.pathname !== "/";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="font-serif text-base font-medium text-sidebar-foreground leading-none">1k Blessings</p>
            <p className="text-[9px] text-sidebar-foreground/30 mt-0.5 uppercase tracking-widest">Salon Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {nav.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
            {user?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground/80 truncate">{user?.full_name || "User"}</p>
            <p className="text-[10px] text-sidebar-foreground/40 capitalize">{user?.role || "user"}</p>
          </div>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors min-h-[44px]"
        >
          <LogOut className="w-3 h-3" /> {t("signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border z-20">
        <SidebarContent />
      </aside>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="md:hidden" style={{ height: "env(safe-area-inset-top)" }} />
        <div className="p-5 md:p-7 max-w-5xl mx-auto pb-28 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bottomTabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] transition-colors relative",
                active ? "text-primary" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{label}</span>
              {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}