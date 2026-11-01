"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { homeForRole } from "@/lib/format";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "CUSTOMER") router.replace(homeForRole(user.role));
  }, [loading, user, router]);

  return (
    <AppShell title="Account" links={[{ href: "/account", label: "My account", icon: UserRound }]}>
      {children}
    </AppShell>
  );
}
