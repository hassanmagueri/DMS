"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { statusLabel } from "@/lib/format";
import type { DashboardSummary } from "@/types/domain";

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

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });

  if (summary.isLoading) return <LoadingBlock label="Loading the report..." />;
  if (summary.isError || !summary.data) {
    return <ErrorBlock message={summary.error?.message ?? "Could not load the report"} onRetry={() => summary.refetch()} />;
  }

  const rows = summary.data.byStatus.filter((item) => item.count > 0);
  const chartRows = rows.map((item) => ({ ...item, label: statusLabel(item.status) }));
  const tableRows = summary.data.byStatus.filter((item) =>
    statusLabel(item.status).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Status mix from the live delivery records. Counts update with the operations desk."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const lines = ["Status,Deliveries,Share"];
              for (const item of tableRows) {
                const share = summary.data.totals.deliveries
                  ? Math.round((item.count / summary.data.totals.deliveries) * 100)
                  : 0;
                lines.push(`${statusLabel(item.status)},${item.count},${share}%`);
              }
              const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "delivery-status.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download spreadsheet
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartRows} dataKey="count" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={2}>
                    {chartRows.map((item) => (
                      <Cell key={item.status} fill={fills[item.status] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableFilter value={query} onChange={setQuery} placeholder="Filter statuses" />
            {tableRows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing matches this filter.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((item) => {
                  const share = summary.data.totals.deliveries
                    ? Math.round((item.count / summary.data.totals.deliveries) * 100)
                    : 0;
                  return (
                    <TableRow key={item.status}>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{share}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
