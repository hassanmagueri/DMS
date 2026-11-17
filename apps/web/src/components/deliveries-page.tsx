"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { canAssign, formatWhen, personName } from "@/lib/format";
import { deliveryPayLabel } from "@/types/payment";
import type { DeliveryPage } from "@/types/domain";

const statuses = ["ALL", "PENDING", "ASSIGNED", "ACCEPTED", "REJECTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"];

export default function DeliveriesPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeliveryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load(nextPage = page, nextStatus = status, nextQuery = query) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "8",
      status: nextStatus,
    });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    api<DeliveryPage>(`/api/deliveries?${params.toString()}`)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q") ?? "";
    const requested = params.get("status") ?? "ALL";
    const initialStatus = statuses.includes(requested) ? requested : "ALL";
    setQuery(initial);
    setStatus(initialStatus);
    load(1, initialStatus, initial);
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: number) {
    const accepted = await confirm({
      title: `Delete delivery #${id}?`,
      body: "This removes the delivery and its history. The action cannot be undone.",
      confirmLabel: "Delete delivery",
    });
    if (!accepted) return;
    try {
      await api(`/api/deliveries/${id}`, { method: "DELETE" });
      toast.success(`Delivery #${id} deleted`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the delivery");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deliveries"
        description="Search the queue and assign a driver. A delivery moves even when pay on delivery is not confirmed yet."
        action={
          <Button asChild>
            <Link href="/deliveries/new">New delivery</Link>
          </Button>
        }
      />
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          load(1, status, query);
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer, city, or id"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
            load(1, value, query);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "ALL" ? "All statuses" : item.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {loading ? <LoadingBlock /> : null}
      {!loading && error ? <ErrorBlock message={error} onRetry={() => load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? (
        <EmptyBlock title="No deliveries" body="Nothing matches this search. Create one or clear the filter." />
      ) : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pay</TableHead>
                <TableHead>Created</TableHead>
                {canManage ? <TableHead></TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((delivery) => (
                <TableRow
                  key={delivery.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/deliveries/${delivery.id}`)}
                >
                  <TableCell className="font-medium text-primary">#{delivery.id}</TableCell>
                  <TableCell>{personName(delivery.customer)}</TableCell>
                  <TableCell>
                    {delivery.pickup.city} → {delivery.dropoff.city}
                  </TableCell>
                  <TableCell>
                    <div>{delivery.driver ? personName(delivery.driver) : "Unassigned"}</div>
                    {canAssign(delivery.status) ? (
                      <Link
                        className="text-xs text-primary"
                        href={`/deliveries/${delivery.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Choose driver
                      </Link>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={delivery.payment?.status ?? "PENDING"}
                      label={deliveryPayLabel(delivery.payment)}
                    />
                    {delivery.payment ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {delivery.payment.amount} {delivery.payment.currency}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatWhen(delivery.createdAt)}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(delivery.id);
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {data.page} of {totalPages} · {data.total} deliveries
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={data.page <= 1}
                onClick={() => {
                  const next = data.page - 1;
                  setPage(next);
                  load(next);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={data.page >= totalPages}
                onClick={() => {
                  const next = data.page + 1;
                  setPage(next);
                  load(next);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
