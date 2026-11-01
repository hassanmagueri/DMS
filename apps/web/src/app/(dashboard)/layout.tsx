"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car, Headset, LayoutDashboard, Package, Truck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/deliveries", label: "Deliveries", icon: Package },
  { href: "/drivers", label: "Drivers", icon: Truck },
  { href: "/dispatchers", label: "Dispatchers", icon: Headset },
  { href: "/vehicles", label: "Vehicles", icon: Car },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "DRIVER") router.replace("/driver");
    else if (user.role === "CUSTOMER") router.replace("/customer");
  }, [loading, user, router]);

  const nav = user?.role === "ADMIN" ? [...links, { href: "/users", label: "Users", icon: Users }] : links;

  return (
    <AppShell title={user?.role === "DISPATCHER" ? "Dispatch" : "Operations"} links={nav}>
      {children}
    </AppShell>
  );
}
