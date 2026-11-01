"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
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
import { canAssign, formatWhen, personName, statusLabel } from "@/lib/format";
import type { DeliveryPage, Driver } from "@/types/domain";

const statuses = ["ALL", "PENDING", "ASSIGNED", "ACCEPTED", "REJECTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"];

export default function DeliveriesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeliveryPage | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);
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
    load(1, "ALL", "");
    api<Driver[]>("/api/drivers")
      .then(setDrivers)
      .catch(() => setDrivers([]));
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = drivers.filter((driver) => driver.user.enabled && driver.status !== "OFFLINE");

  async function assign(deliveryId: number) {
    const driverId = picked[deliveryId];
    if (!driverId) return;
    setAssigningId(deliveryId);
    try {
      await api(`/api/deliveries/${deliveryId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: Number(driverId) }),
      });
      toast.success("Driver assigned");
      setPicked((current) => {
        const next = { ...current };
        delete next[deliveryId];
        return next;
      });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not assign the driver");
    } finally {
      setAssigningId(null);
    }
  }

  async function remove(id: number) {
    if (!window.confirm(`Delete delivery #${id}? This cannot be undone.`)) return;
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Assign a pending or rejected delivery to an available driver. The driver accepts or rejects it.
          </p>
        </div>
        <Button asChild>
          <Link href="/deliveries/new">New delivery</Link>
        </Button>
      </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/deliveries/${delivery.id}`}>
                      #{delivery.id}
                    </Link>
                  </TableCell>
                  <TableCell>{personName(delivery.customer)}</TableCell>
                  <TableCell>
                    {delivery.pickup.city} → {delivery.dropoff.city}
                  </TableCell>
                  <TableCell>
                    {canAssign(delivery.status) ? (
                      <div className="flex min-w-64 flex-col gap-2 sm:flex-row">
                        <Select
                          value={picked[delivery.id] || (delivery.driver ? String(delivery.driver.id) : undefined)}
                          onValueChange={(value) => setPicked((current) => ({ ...current, [delivery.id]: value }))}
                        >
                          <SelectTrigger className="w-full sm:w-52">
                            <SelectValue placeholder="Choose a driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((driver) => (
                              <SelectItem key={driver.id} value={String(driver.id)}>
                                {personName(driver.user)} · {statusLabel(driver.status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          disabled={
                            assigningId === delivery.id ||
                            !picked[delivery.id] ||
                            picked[delivery.id] === String(delivery.driver?.id ?? "")
                          }
                          onClick={() => assign(delivery.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    ) : delivery.driver ? (
                      personName(delivery.driver)
                    ) : (
                      "Unassigned"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell>{formatWhen(delivery.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" onClick={() => remove(delivery.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
