import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, Scissors, ChevronLeft, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/renters", label: "Renters", icon: Users },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/account", label: "Account", icon: Settings },
];

const PRIMARY_ROUTES = ["/", "/renters", "/payments", "/account"];

function NavLink({ item, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{item.label}</span>
    </Link>
  );
}

function BottomNavItem({ item }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSecondaryRoute = !PRIMARY_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border flex items-center px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(56px + env(safe-area-inset-top))' }}
      >
        {isSecondaryRoute ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">1k Blessings</span>
          </div>
        )}
      </header>

      {/* Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(item => (
          <BottomNavItem key={item.path} item={item} />
        ))}
      </nav>



      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col bg-card border-r border-border z-40">
        <div className="flex items-center gap-2.5 px-5 h-16">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight">1k Blessings</span>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Rent Management</p>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">© 2026 1k Blessings</p>
        <Link to="/account" className="text-[11px] text-muted-foreground hover:text-foreground mt-1 block">Account Settings</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="lg:pl-[240px] min-h-screen"
        style={{ paddingTop: 'calc(56px + env(safe-area-inset-top))', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 lg:pt-8" style={{ paddingTop: undefined }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}