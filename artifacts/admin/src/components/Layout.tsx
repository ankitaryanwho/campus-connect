import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Briefcase, Truck, CreditCard,
  MessageSquare, BarChart3, Bell, LogOut, Hexagon,
  Package, MessageCircle, GraduationCap, Store, Menu, X,
  FileText, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/users", label: "Users", icon: Users, group: "Management" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, group: "Management" },
  { href: "/services", label: "Services", icon: Briefcase, group: "Management" },
  { href: "/transactions", label: "Payments & Wallet", icon: CreditCard, group: "Management" },
  { href: "/posts", label: "Social Feed", icon: MessageSquare, group: "Content" },
  { href: "/comments", label: "Comments", icon: FileText, group: "Content" },
  { href: "/chat", label: "Chat Moderation", icon: MessageCircle, group: "Content" },
  { href: "/coaching", label: "Coaching", icon: GraduationCap, group: "Services" },
  { href: "/outlet", label: "Outlet / Shop", icon: Store, group: "Services" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { href: "/notifications", label: "Broadcast", icon: Bell, group: "Insights" },
];

const GROUPS = ["Overview", "Management", "Content", "Services", "Insights"];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token && location !== "/") {
      setLocation("/");
    }
  }, [location, setLocation]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/");
  };

  if (location === "/") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Hexagon className="w-5 h-5 text-white fill-white/20" />
          </div>
          CampusConnect
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-4">
              <div className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = location.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      )}
                      <item.icon
                        className={cn(
                          "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                          isActive ? "scale-110" : "group-hover:scale-110"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-inner flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">super_admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl flex-col z-20 shadow-2xl shadow-black/50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 flex flex-col z-50 border-r border-sidebar-border bg-sidebar backdrop-blur-xl shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-background via-background to-sidebar">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-white/5 bg-sidebar/30 backdrop-blur-md flex-shrink-0 relative z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-primary font-display font-bold text-lg">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Hexagon className="w-4 h-4 text-white fill-white/20" />
            </div>
            CampusConnect Admin
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
