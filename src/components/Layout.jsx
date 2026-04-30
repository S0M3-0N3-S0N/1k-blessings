import { useState, useEffect } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Scissors, BarChart2, Receipt, Calendar, Settings, LogOut,
  Sparkles, StickyNote, MoreHorizontal, X, Star
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
  const [moreOpen, setMoreOpen] = useState(false);

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
    { path: "/clients", label: t("clients"), icon: Users },
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
  const morePages = nav.filter(n => !bottomTabs.some(t => t.path === n.path));

  const initials = user?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #1a1508 0%, #0f0c04 60%, #1a1200 100%)" }}>
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9984a, #8a6020)" }}>
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold leading-none" style={{ color: "#d4a853" }}>1k Blessings</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #c9984a, #8a6020)", color: "#fff" }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: "#e8d5a3" }}>{user?.full_name || "User"}</p>
            <p className="text-[10px] capitalize" style={{ color: "rgba(212,168,83,0.5)" }}>{user?.role || "user"}</p>
          </div>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-lg w-full transition-colors hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs">{t("signOut")}</span>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {nav.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          const showBadge = path === "/payments" && overdueCount > 0;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] relative",
              )}
              style={active ? {
                background: "linear-gradient(135deg, rgba(201,152,74,0.25), rgba(138,96,32,0.15))",
                border: "1px solid rgba(201,152,74,0.25)",
                color: "#d4a853",
              } : {
                color: "rgba(255,255,255,0.45)",
                border: "1px solid transparent",
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#d4a853" }} />
              )}
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{overdueCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 z-20" style={{ background: "linear-gradient(180deg, #1a1508 0%, #0f0c04 100%)" }}>
        <SidebarContent />
      </aside>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <div className="md:hidden" style={{ height: "env(safe-area-inset-top)" }} />
        <div className="p-4 md:p-7 max-w-5xl mx-auto pb-28 md:pb-8">
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="flex mx-3 mb-3 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(20, 15, 5, 0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(201,152,74,0.2)",
          }}
        >
          {bottomTabs.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            const showBadge = path === "/payments" && overdueCount > 0;
            return (
              <Link
                key={path}
                to={path}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all relative"
                style={{ color: active ? "#d4a853" : "rgba(255,255,255,0.3)" }}
              >
                {active && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-x-1 inset-y-1 rounded-xl"
                    style={{ background: "rgba(201,152,74,0.12)", border: "1px solid rgba(201,152,74,0.2)" }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon className="w-5 h-5" />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[13px] h-3.5 flex items-center justify-center px-0.5">{overdueCount}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium relative z-10">{label}</span>
              </Link>
            );
          })}
          {morePages.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all relative"
              style={{ color: moreOpen ? "#d4a853" : "rgba(255,255,255,0.3)" }}
            >
              {moreOpen && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-x-1 inset-y-1 rounded-xl"
                  style={{ background: "rgba(201,152,74,0.12)", border: "1px solid rgba(201,152,74,0.2)" }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
              <MoreHorizontal className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">More</span>
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
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl"
              style={{
                background: "linear-gradient(180deg, #1c1608 0%, #110e03 100%)",
                border: "1px solid rgba(201,152,74,0.2)",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)"
              }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full" style={{ background: "rgba(201,152,74,0.3)" }} />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <p className="font-serif text-lg font-medium" style={{ color: "#d4a853" }}>More</p>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl transition-colors hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                </button>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                {morePages.map(({ path, label, icon: Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl transition-all"
                      style={active ? {
                        background: "rgba(201,152,74,0.15)",
                        border: "1px solid rgba(201,152,74,0.3)",
                        color: "#d4a853",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "rgba(255,255,255,0.55)",
                      }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={active ? { background: "rgba(201,152,74,0.2)" } : { background: "rgba(255,255,255,0.06)" }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
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