"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";

type ActionNotification = {
  id: string;
  deliveryId: number;
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

export function ActionNotifications() {
  const { user } = useAuth();
  const seen = useRef<Set<string> | null>(null);
  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    refetchInterval: 15000,
    queryFn: () => api<{ items: ActionNotification[] }>("/api/notifications"),
  });

  const items = query.data?.items ?? [];

  useEffect(() => {
    if (!query.data || (user?.role !== "DISPATCHER" && user?.role !== "ADMIN")) return;
    const requests = query.data.items.filter((item) => item.title === "New delivery request");
    if (seen.current === null) {
      seen.current = new Set(requests.map((item) => item.id));
      return;
    }
    for (const item of requests) {
      if (!seen.current.has(item.id)) {
        toast.message(item.title, { description: item.body });
      }
    }
    seen.current = new Set(requests.map((item) => item.id));
  }, [query.data, user?.role]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Needed actions">
          <Bell />
          {items.length > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
              {items.length > 9 ? "9+" : items.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Needed actions</p>
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nothing is waiting on you.</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild className="items-start py-2">
              <Link href={item.href}>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.body}</span>
                  <span className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
