"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { formatAddress } from "@/lib/format";
import type { Delivery } from "@/types/domain";
import type { PaymentRecord } from "@/types/payment";

type Quote = { amount: string; currency: string };

export default function CustomerPayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Delivery>(`/api/deliveries/${params.id}`)
      .then(async (row) => {
        const price = await api<Quote>(`/api/pricing/quote?weight=${row.weight}`);
        if (!active) return;
        setDelivery(row);
        setQuote(price);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function confirm() {
    if (!delivery) return;
    setBusy(true);
    const storageKey = `dms-pay-${delivery.id}`;
    const existingKey = sessionStorage.getItem(storageKey);
    const idempotencyKey = existingKey ?? crypto.randomUUID();
    sessionStorage.setItem(storageKey, idempotencyKey);
    try {
      await api<{ payment: PaymentRecord }>("/api/payments/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ deliveryId: delivery.id, method: "CASH_ON_DELIVERY" }),
      });
      toast.success("Pay on delivery confirmed");
      router.push(`/customer/${delivery.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not confirm payment");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="Preparing the amount..." />;
  if (error || !delivery || !quote) return <ErrorBlock message={error ?? "Could not prepare payment"} />;

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardDescription>Delivery #{delivery.id}</CardDescription>
          <CardTitle className="text-2xl">Pay on delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="text-3xl font-semibold tracking-tight">
              {quote.amount} <span className="text-lg font-medium text-muted-foreground">{quote.currency}</span>
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Pickup</dt>
              <dd className="text-right">{formatAddress(delivery.pickup)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Drop-off</dt>
              <dd className="text-right">{formatAddress(delivery.dropoff)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Weight</dt>
              <dd>{delivery.weight} kg</dd>
            </div>
          </dl>
          {delivery.proof.code ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">Delivery code</p>
              <p className="text-2xl font-semibold tracking-[0.35em]">{delivery.proof.code}</p>
              <p className="mt-1 text-sm text-muted-foreground">Give this code to the driver when the parcel arrives.</p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Nothing is charged now. Pay the driver in cash when the parcel arrives.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={confirm} disabled={busy}>
            {busy ? "Confirming..." : "Confirm pay on delivery"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
