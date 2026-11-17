"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";

type ActionRole = "CUSTOMER" | "DRIVER" | "DISPATCHER";

type ActionNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  role?: ActionRole;
  person?: string;
};

const filters: { id: "ALL" | ActionRole; label: string }[] = [
  { id: "ALL", label: "All roles" },
  { id: "CUSTOMER", label: "Customers" },
  { id: "DRIVER", label: "Drivers" },
  { id: "DISPATCHER", label: "Dispatchers" },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const listAll = isAdmin || user?.role === "DISPATCHER";
  const [role, setRole] = useState<(typeof filters)[number]["id"]>("ALL");
  const query = useQuery({
    queryKey: ["notifications", listAll ? "all" : "mine", user?.id],
    enabled: Boolean(user),
    queryFn: () => api<{ items: ActionNotification[]; limited: boolean }>(listAll ? "/api/notifications?all=1" : "/api/notifications"),
  });
  const items = (query.data?.items ?? []).filter((item) => role === "ALL" || item.role === role);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Actions"
        description={
          isAdmin
            ? query.data?.limited
              ? "The latest open actions, grouped by the person who still has to move them. Older work stays on Deliveries."
              : "Every open action, grouped by the person who still has to move it."
            : "Every delivery that still needs a driver or a response."
        }
      />
      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={role === filter.id ? "default" : "outline"}
              onClick={() => setRole(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      ) : null}
      {query.isLoading ? <LoadingBlock label="Loading notifications..." /> : null}
      {query.isError ? <ErrorBlock message={query.error.message} onRetry={() => query.refetch()} /> : null}
      {query.data && items.length === 0 ? (
        <EmptyBlock title="Nothing waiting" body="No open action matches this role." />
      ) : null}
      {items.length > 0 ? (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="block px-4 py-3 transition-colors hover:bg-muted/60">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{item.title}</p>
                {item.role ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {item.role}
                  </span>
                ) : null}
              </div>
              {item.person ? <p className="mt-1 text-sm">{item.person}</p> : null}
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatWhen(item.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
