import { useState, useEffect } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Scissors, BarChart2, Receipt, Calendar, Settings, LogOut,
  Sparkles, StickyNote, MoreHorizontal, X
} from "lucide-react";
import { cn, isPaymentOverdue } from "@/lib/utils";
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
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    Promise.all([base44.entities.Payment.list(), base44.entities.Renter.list()]).then(([payments, renters]) => {
      const rentRenters = renters.filter(r => r.payment_model === "rent" && r.status === "active");
      let count = 0;
      rentRenters.forEach(r => {
        const payment = payments.find(p => p.renter_id === r.id && p.period?.startsWith(currentMonthStr));
        if (isPaymentOverdue(payment, r)) count++;
      });
      setOverdueCount(count);
    });
  }, [isAdmin]);

  const adminNav = [
    { path: "/", label: t("dashboard"), icon: LayoutDashboard },
    { path: "/renters", label: t("stylists"), icon: Users },
    { path: "/clients", label: "Clients", icon: Users },
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
  const [moreOpen, setMoreOpen] = useState(false);

  // Pages not in bottom tabs — shown in "More" drawer
  const morePages = nav.filter(n => !bottomTabs.some(t => t.path === n.path));

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
          const showBadge = path === "/payments" && overdueCount > 0;
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
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{overdueCount}</span>
              )}
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative flex w-full mx-3 mb-3 bg-sidebar/90 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg overflow-hidden">
          {bottomTabs.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            const showBadge = path === "/payments" && overdueCount > 0;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all relative",
                  active ? "text-primary" : "text-sidebar-foreground/35 hover:text-sidebar-foreground/70"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-x-1 inset-y-1 bg-primary/12 rounded-xl"
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  />
                )}
                <div className="relative">
                  <Icon className="w-[18px] h-[18px] relative z-10" />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[13px] h-3.5 flex items-center justify-center px-0.5 z-20">{overdueCount}</span>
                  )}
                </div>
              </Link>
            );
          })}
          {morePages.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all relative",
                moreOpen ? "text-primary" : "text-sidebar-foreground/35 hover:text-sidebar-foreground/70"
              )}
            >
              {moreOpen && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-x-1 inset-y-1 bg-primary/12 rounded-xl"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
              <MoreHorizontal className="w-[18px] h-[18px] relative z-10" />
            </button>
          )}
        </div>
      </nav>

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar rounded-t-3xl border-t border-sidebar-border shadow-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
            >
              {/* drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-sidebar-foreground/20" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <p className="font-serif text-lg font-medium text-sidebar-foreground">More</p>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl hover:bg-sidebar-foreground/8 transition-colors">
                  <X className="w-4 h-4 text-sidebar-foreground/50" />
                </button>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2.5">
                {morePages.map(({ path, label, icon: Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl border transition-all",
                        active
                          ? "bg-primary/12 border-primary/30 text-primary"
                          : "border-sidebar-border/60 text-sidebar-foreground/55 hover:bg-sidebar-foreground/6 hover:text-sidebar-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        active ? "bg-primary/15" : "bg-sidebar-foreground/6"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}