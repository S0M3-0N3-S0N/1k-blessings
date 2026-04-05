import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, Menu, X, Scissors } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/renters", label: "Renters", icon: Users },
  { path: "/payments", label: "Payments", icon: CreditCard },
];

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

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">1k Blessings</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-3 space-y-1" onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(item => (
              <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />
            ))}
          </div>
        </div>
      )}

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
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-[240px] pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}