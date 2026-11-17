"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { navForRole } from "@/lib/navigation";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  return <AppShell links={navForRole(user?.role ?? "CUSTOMER")}>{children}</AppShell>;
}
