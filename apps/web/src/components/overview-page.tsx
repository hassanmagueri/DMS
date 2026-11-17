"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { failureReasonLabel, formatWhen, isLate, personName, statusLabel, waitingLabel } from "@/lib/format";
import type { DashboardSummary, Delivery } from "@/types/domain";

const fills: Record<string, string> = {
  PENDING: "#d97706",
  ASSIGNED: "#2563eb",
  ACCEPTED: "#4f46e5",
  REJECTED: "#ea580c",
  PICKED_UP: "#7c3aed",
  IN_TRANSIT: "#0284c7",
  DELIVERED: "#059669",
  FAILED: "#dc2626",
  CANCELLED: "#71717a",
};

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });
  const pending = useMemo(() => {
    return [...(summaryQuery.data?.pending ?? [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [summaryQuery.data?.pending]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pending;
    return pending.filter((delivery) =>
      [String(delivery.id), personName(delivery.customer), delivery.pickup.city, delivery.dropoff.city, waitingLabel(delivery.createdAt)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [pending, query]);

  if (summaryQuery.isLoading) return <LoadingBlock label="Loading the desk..." />;
  if (summaryQuery.isError || !summaryQuery.data) {
    return <ErrorBlock message={summaryQuery.error?.message ?? "Could not load the dashboard"} onRetry={() => summaryQuery.refetch()} />;
  }
  const summary = summaryQuery.data;
  const metrics = [
    { label: "Total deliveries", value: summary.totals.deliveries },
    { label: "Active", value: summary.totals.inProgress },
    { label: "Pending", value: summary.totals.pending },
    { label: "Delivered", value: summary.totals.delivered },
    { label: "Available drivers", value: summary.totals.availableDrivers },
    { label: "Customers", value: summary.totals.customers },
  ];
  const chart = summary.byStatus.map((item) => ({
    status: item.status,
    label: statusLabel(item.status),
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TableFilter value={query} onChange={setQuery} placeholder="Filter these pending deliveries" />
          {summary.totals.pending > pending.length ? (
            <p className="text-sm text-muted-foreground">
              Oldest {pending.length} of {summary.totals.pending}.{" "}
              <Link className="text-primary" href="/deliveries?status=PENDING">
                Open the full list
              </Link>
            </p>
          ) : null}
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries are waiting for a driver.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing matches this filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((delivery) => (
                  <DeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                    showWaiting
                    onOpen={() => router.push(`/deliveries/${delivery.id}`)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deliveries by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-28} height={64} textAnchor="end" />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chart.map((item) => (
                    <Cell key={item.status} fill={fills[item.status] ?? "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.activities.length === 0 ? <p className="text-sm text-muted-foreground">No status changes yet.</p> : null}
            {summary.activities.slice(0, 8).map((event) => (
              <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
                <p className="text-sm">
                  <Link className="font-medium text-primary" href={`/deliveries/${event.deliveryId}`}>
                    #{event.deliveryId}
                  </Link>{" "}
                  {statusLabel(event.toStatus)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(event.createdAt)}
                  {event.actor ? ` · ${event.actor}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {user?.role === "ADMIN" ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recent.map((delivery) => (
                    <DeliveryRow key={delivery.id} delivery={delivery} onOpen={() => router.push(`/deliveries/${delivery.id}`)} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DeliveryRow({
  delivery,
  onOpen,
  showWaiting = false,
}: {
  delivery: Delivery;
  onOpen: () => void;
  showWaiting?: boolean;
}) {
  const late = showWaiting && isLate(delivery.createdAt);
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium text-primary">#{delivery.id}</TableCell>
      <TableCell>{personName(delivery.customer)}</TableCell>
      <TableCell>
        {delivery.pickup.city} → {delivery.dropoff.city}
      </TableCell>
      <TableCell>
        <StatusBadge status={delivery.status} />
        {delivery.failureReason ? (
          <p className="mt-1 text-xs text-muted-foreground">{failureReasonLabel(delivery.failureReason)}</p>
        ) : null}
      </TableCell>
      {showWaiting ? (
        <TableCell>
          <span className="inline-flex items-center gap-2">
            <span>{waitingLabel(delivery.createdAt)}</span>
            {late ? <StatusBadge status="LATE" label="Late" /> : null}
          </span>
        </TableCell>
      ) : null}
      <TableCell className="text-muted-foreground">{formatWhen(delivery.createdAt)}</TableCell>
    </TableRow>
  );
}
