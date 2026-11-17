"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { homeForRole } from "@/lib/format";
import { navForRole } from "@/lib/navigation";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "CUSTOMER") router.replace(homeForRole(user.role));
  }, [loading, user, router]);

  return <AppShell links={navForRole("CUSTOMER")}>{children}</AppShell>;
}
