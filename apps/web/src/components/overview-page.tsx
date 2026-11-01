"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { formatWhen, personName, statusLabel } from "@/lib/format";
import type { DashboardSummary } from "@/types/domain";

const cards = [
  { key: "deliveries", label: "Total deliveries" },
  { key: "pending", label: "Pending" },
  { key: "inProgress", label: "Active" },
  { key: "customers", label: "Customers" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed", label: "Failed" },
  { key: "drivers", label: "Drivers" },
  { key: "availableDrivers", label: "Available drivers" },
  { key: "dispatchers", label: "Dispatchers" },
] as const;

export default function OverviewPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });

  if (summaryQuery.isLoading) return <LoadingBlock label="Loading live counts..." />;
  if (summaryQuery.isError || !summaryQuery.data) {
    return <ErrorBlock message={summaryQuery.error?.message ?? "Could not load the dashboard"} onRetry={() => summaryQuery.refetch()} />;
  }
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">Counts come from the deliveries and drivers tables.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{summary.totals[card.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Deliveries by status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {summary.byStatus.map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">{statusLabel(item.status)}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status chart</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.byStatus.map((item) => ({ status: statusLabel(item.status), count: item.count }))}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-25} height={60} textAnchor="end" />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {summary.activities.length === 0 ? <p className="text-muted-foreground">No status changes yet.</p> : null}
          {summary.activities.map((event) => (
            <p key={event.id}>
              {formatWhen(event.createdAt)} · #{event.deliveryId} · {statusLabel(event.toStatus)}
              {event.actor ? ` · ${event.actor}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recent.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <Link className="font-medium text-primary" href={`/deliveries/${delivery.id}`}>
                        #{delivery.id}
                      </Link>
                    </TableCell>
                    <TableCell>{personName(delivery.customer)}</TableCell>
                    <TableCell>
                      <StatusBadge status={delivery.status} />
                    </TableCell>
                    <TableCell>{formatWhen(delivery.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
