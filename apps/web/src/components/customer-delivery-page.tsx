"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { DeliveryCode, DeliveryConfirmation } from "@/components/delivery-proof";
import { StarPicker, StarRating } from "@/components/star-rating";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { allowedActions, failureReasonLabel, formatAddress, formatWhen, personName, statusLabel } from "@/lib/format";
import type { Delivery } from "@/types/domain";
import { paymentStatusLabel } from "@/types/payment";

export default function CustomerDeliveryPage() {
  const confirm = useConfirm();
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
    if (!delivery) return;
    const accepted = await confirm({
      title: "Cancel this delivery?",
      body: "You can cancel before the driver picks up the parcel.",
      confirmLabel: "Cancel delivery",
    });
    if (!accepted) return;
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
          <p>
            Driver:{" "}
            {delivery.driver ? (
              <Link className="text-primary" href={`/people/${delivery.driver.userId}`}>
                {personName(delivery.driver)}
              </Link>
            ) : (
              "Not assigned yet"
            )}
          </p>
          {delivery.driver?.location ? (
            <p>
              Driver location: {delivery.driver.location.latitude.toFixed(5)}, {delivery.driver.location.longitude.toFixed(5)}
            </p>
          ) : null}
        </CardContent>
      </Card>
      {delivery.proof.code ? <DeliveryCode code={delivery.proof.code} /> : null}
      {delivery.proof.confirmedAt ? (
        <DeliveryConfirmation confirmedAt={delivery.proof.confirmedAt} confirmedBy={delivery.proof.confirmedBy} />
      ) : null}
      {delivery.failureReason ? (
        <p className="text-sm text-muted-foreground">Failed: {failureReasonLabel(delivery.failureReason)}</p>
      ) : null}
      {delivery.proof.confirmedAt && delivery.driver ? (
        <Card>
          <CardHeader>
            <CardTitle>Rate the driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {delivery.rating ? (
              <div className="space-y-2">
                <StarRating value={delivery.rating.score} count={1} />
                <p className="text-muted-foreground">Saved for {personName(delivery.driver)}.</p>
              </div>
            ) : (
              <StarPicker
                disabled={busy}
                onChange={async (score) => {
                  setBusy(true);
                  try {
                    setDelivery(await api<Delivery>(`/api/deliveries/${delivery.id}/rating`, {
                      method: "POST",
                      body: JSON.stringify({ score }),
                    }));
                    toast.success("Rating saved");
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Could not save the rating");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {delivery.payment ? (
            <>
              <p className="text-base font-medium">
                {delivery.payment.amount} {delivery.payment.currency}
              </p>
              <p>{paymentStatusLabel(delivery.payment.status)}</p>
              <div>
                <Link className="text-primary" href={`/customer/payments/${delivery.payment.id}`}>
                  View receipt
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>Due on delivery. Pay the driver in cash when the parcel arrives.</p>
              <Link className="text-primary" href={`/customer/${delivery.id}/pay`}>
                Review the amount
              </Link>
            </>
          )}
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
