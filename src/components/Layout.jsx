import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Scissors, BarChart2, Receipt, Calendar, Settings, LogOut, Sparkles, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";

const adminNav = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/renters", label: "Stylists & Payroll", icon: Users },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/reports", label: "Monthly Reports", icon: BarChart2 },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/account", label: "Account", icon: Settings },
];

const renterNav = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/paystub", label: "Paystub", icon: Receipt },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/account", label: "Account", icon: Settings },
];

// Bottom tab items (mobile only) — 4 items for admin, 4 for renter
const adminBottomTabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/renters", label: "Stylists", icon: Users },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/messages", label: "Messages", icon: MessageSquare },
];

const renterBottomTabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/account", label: "Account", icon: Settings },
];

const slideVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const nav = isAdmin ? adminNav : renterNav;
  const bottomTabs = isAdmin ? adminBottomTabs : renterBottomTabs;
  const canGoBack = window.history.length > 1 && location.pathname !== "/";

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="font-serif text-base font-medium text-white leading-none">1k Blessings</p>
            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-widest">Salon Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                active
                  ? "bg-primary text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
            {user?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{user?.full_name || "User"}</p>
            <p className="text-[10px] text-white/30 capitalize">{user?.role || "user"}</p>
          </div>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors min-h-[44px]"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#0d0d0d] border-r border-white/5">
        <NavContent />
      </aside>

      {/* Mobile top header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d0d0d] border-b border-white/5 flex items-center justify-between px-4"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(56px + env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center gap-2 h-14">
          {canGoBack ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-white/60 hover:text-white transition-colors min-h-[44px] pr-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-serif text-sm font-medium text-white">1k Blessings</span>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Spacer for mobile top header */}
        <div className="md:hidden" style={{ height: "calc(56px + env(safe-area-inset-top))" }} />

        <div className="p-5 md:p-7 max-w-6xl mx-auto pb-24 md:pb-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d] border-t border-white/5 flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bottomTabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors",
                active ? "text-primary" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}