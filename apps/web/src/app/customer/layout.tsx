"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { homeForRole } from "@/lib/format";

const links = [
  { href: "/customer", label: "My deliveries", icon: Package },
  { href: "/customer/new", label: "New request", icon: Plus },
  { href: "/account", label: "Profile", icon: UserRound },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "CUSTOMER") router.replace(homeForRole(user.role));
  }, [loading, user, router]);

  return (
    <AppShell title="Customer" links={links}>
      {children}
    </AppShell>
  );
}
