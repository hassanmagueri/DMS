"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { homeForRole } from "@/lib/format";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "DRIVER") router.replace(homeForRole(user.role));
  }, [loading, user, router]);

  return (
    <AppShell title="My deliveries" links={[{ href: "/driver", label: "My deliveries", icon: Package }]}>
      {children}
    </AppShell>
  );
}
