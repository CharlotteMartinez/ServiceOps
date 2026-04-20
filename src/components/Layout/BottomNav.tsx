import { useState, useEffect } from "react";
import { Home, Package, Wrench, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "react-router-dom";
import { getTickets } from "@/lib/api";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  type?: "delivery" | "maintenance";
}

const navItems: NavItem[] = [
  { icon: Home, label: "Trang chủ", path: "/" },
  { icon: Package, label: "Giao hàng", path: "/delivery-install", type: "delivery" },
  { icon: Wrench, label: "Bảo hành", path: "/maintenance", type: "maintenance" },
  { icon: BarChart3, label: "Hoạt động", path: "/sales" },
];

const BottomNav = () => {
  const location = useLocation();
  const [counts, setCounts] = useState({ delivery: 0, maintenance: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [delRes, mainRes] = await Promise.all([
          getTickets({ type: "delivery", status: "assigned", pageSize: 1 }),
          getTickets({ type: "maintenance", status: "assigned", pageSize: 1 }),
        ]);
        setCounts({
          delivery: delRes.success ? delRes.data?.total || 0 : 0,
          maintenance: mainRes.success ? mainRes.data?.total || 0 : 0,
        });
      } catch (error) {
        console.error("Error fetching nav counts:", error);
      }
    };
    fetchCounts();
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-elevated md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 max-w-lg grid-cols-4 mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const count = item.type ? counts[item.type] : 0;
          return (
            <Link
              key={index}
              to={item.path}
              className={cn(
                "inline-flex flex-col items-center justify-center px-2 hover:bg-accent transition-colors",
                isActive && "text-primary"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 mb-1", isActive && "text-primary")} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-[10px] flex items-center justify-center text-white font-medium border-2 border-card">
                    {count}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] sm:text-xs",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;