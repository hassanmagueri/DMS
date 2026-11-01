"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { allowedActions, formatAddress, formatWhen, personName, statusLabel } from "@/lib/format";
import type { Delivery } from "@/types/domain";

export default function CustomerDeliveryPage() {
  const params = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api<Delivery>(`/api/deliveries/${params.id}`)
      .then(setDelivery)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function cancel() {
    if (!delivery || !window.confirm("Cancel this delivery?")) return;
    setBusy(true);
    try {
      setDelivery(await api<Delivery>(`/api/deliveries/${delivery.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "CANCELLED" }),
      }));
      toast.success("Delivery cancelled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not cancel the delivery");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !delivery) return <ErrorBlock message={error ?? "Delivery not found"} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Delivery #{delivery.id}</h2>
        <StatusBadge status={delivery.status} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Pickup: {formatAddress(delivery.pickup)}</p>
          <p>Drop-off: {formatAddress(delivery.dropoff)}</p>
          <p>Weight: {delivery.weight} kg</p>
          <p>Driver: {delivery.driver ? personName(delivery.driver) : "Not assigned yet"}</p>
          {delivery.driver?.location ? (
            <p>
              Driver location: {delivery.driver.location.latitude.toFixed(5)}, {delivery.driver.location.longitude.toFixed(5)}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {delivery.timeline.length === 0 ? <p className="text-muted-foreground">No history yet.</p> : null}
          {delivery.timeline.map((event) => (
            <p key={event.id}>
              {formatWhen(event.createdAt)} · {event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ""}
              {statusLabel(event.toStatus)}
              {event.actor ? ` · ${event.actor}` : ""}
              {event.note ? ` · ${event.note}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
      {allowedActions(delivery.status, "CUSTOMER").includes("CANCELLED") ? (
        <Button variant="destructive" disabled={busy} onClick={cancel}>
          Cancel delivery
        </Button>
      ) : null}
    </div>
  );
}
