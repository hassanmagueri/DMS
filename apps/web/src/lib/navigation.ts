import {
  Banknote,
  Car,
  Headset,
  LayoutDashboard,
  MapPin,
  Package,
  ListChecks,
  PieChart,
  Plus,
  Settings,
  Truck,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

const operatorLinks: NavLink[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deliveries", label: "Deliveries", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/drivers", label: "Drivers", icon: Truck },
  { href: "/dispatchers", label: "Dispatchers", icon: Headset },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/account", label: "Settings", icon: Settings },
];

export function navForRole(role: string): NavLink[] {
  if (role === "ADMIN") {
    return [
      ...operatorLinks,
      { href: "/users", label: "Users", icon: Shield },
      { href: "/notifications", label: "Actions", icon: ListChecks },
    ];
  }
  if (role === "DISPATCHER") return operatorLinks;
  if (role === "DRIVER") {
    return [
      { href: "/driver", label: "Deliveries", icon: Package },
      { href: "/account", label: "Settings", icon: Settings },
    ];
  }
  return [
    { href: "/customer", label: "Deliveries", icon: Package },
    { href: "/customer/new", label: "New request", icon: Plus },
    { href: "/customer/addresses", label: "Addresses", icon: MapPin },
    { href: "/customer/payments", label: "Payments", icon: Banknote },
    { href: "/account", label: "Settings", icon: Settings },
  ];
}

export function titleForPath(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/deliveries/new")) return "New delivery";
  if (pathname.startsWith("/deliveries/")) return "Delivery";
  if (pathname.startsWith("/deliveries")) return "Deliveries";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/drivers")) return "Drivers";
  if (pathname.startsWith("/dispatchers")) return "Dispatchers";
  if (pathname.startsWith("/vehicles")) return "Vehicles";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/notifications")) return "Actions";
  if (pathname.startsWith("/people")) return "Profile";
  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/account")) return "Settings";
  if (pathname.startsWith("/customer/new")) return "New request";
  if (pathname.startsWith("/customer/addresses")) return "Addresses";
  if (pathname.startsWith("/customer/payments")) return "Payments";
  if (pathname.startsWith("/customer/") && pathname.endsWith("/pay")) return "Pay on delivery";
  if (pathname.startsWith("/customer/")) return "Delivery";
  if (pathname.startsWith("/customer")) return "Deliveries";
  if (pathname.startsWith("/driver")) return "Deliveries";
  return "DMS";
}
