import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, Scissors, ChevronLeft, Settings,
  Calendar, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://media.base44.com/images/public/69d2051a39e024cf4a317ed3/246a2953f_1k.jpeg";

const ADMIN_NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/renters", label: "Renters & Payroll", icon: Users },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/account", label: "Account", icon: Settings },
];

const RENTER_NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/paystub", label: "Paystub", icon: FileText },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/account", label: "Account", icon: Settings },
];

const PRIMARY_ROUTES = ["/", "/renters", "/payments", "/account", "/calendar", "/paystub", "/services", "/messages"];

function NavLink({ item }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}>
      <Icon className="w-[18px] h-[18px]" />
      <span>{item.label}</span>
    </Link>
  );
}

function BottomNavItem({ item }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;
  const handleClick = () => {
    if (isActive) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <Link
      to={item.path}
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : RENTER_NAV;
  const isSecondaryRoute = !PRIMARY_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3"
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(56px + env(safe-area-inset-top))" }}>
        {isSecondaryRoute ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="1k Blessings" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40" />
            <span className="font-semibold text-sm tracking-tight">1k Blessings</span>
          </div>
        )}
      </header>

      {/* Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navItems.map((item) => <BottomNavItem key={item.path} item={item} />)}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col bg-card border-r border-border z-40">
        <div className="flex items-center gap-2.5 px-5 h-16">
          <img src={LOGO_URL} alt="1k Blessings" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/40" />
          <div>
            <span className="font-semibold text-sm tracking-tight text-foreground">1k Blessings</span>
            <p className="text-[10px] text-primary/80 tracking-wide uppercase font-medium">
              {isAdmin ? "Admin View" : "My Dashboard"}
            </p>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-2 space-y-1">
          {navItems.map((item) => <NavLink key={item.path} item={item} />)}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">© 2026 1k Blessings</p>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="lg:pl-[240px] min-h-screen"
        style={{ paddingTop: "calc(56px + env(safe-area-inset-top))", paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}