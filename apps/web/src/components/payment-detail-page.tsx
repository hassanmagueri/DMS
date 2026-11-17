"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { paymentStatusLabel, paymentStatusNote, type PaymentRecord } from "@/types/payment";

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<PaymentRecord>(`/api/payments/${params.id}`)
      .then(setPayment)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) return <LoadingBlock />;
  if (error || !payment) return <ErrorBlock message={error ?? "Payment not found"} onRetry={load} />;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardDescription>Delivery #{payment.deliveryId}</CardDescription>
          <CardTitle className="flex items-start justify-between gap-3 text-2xl">
            <span>
              {payment.amount} {payment.currency}
            </span>
            <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
              {paymentStatusLabel(payment.status)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{paymentStatusNote(payment.status)}</p>
          <p className="text-muted-foreground">Pay on delivery · {formatWhen(payment.createdAt)}</p>
          <Link className="text-primary" href={`/customer/${payment.deliveryId}`}>
            View delivery
          </Link>
        </CardContent>
      </Card>
      {payment.refunds.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payment.refunds.map((refund) => (
              <p key={refund.id}>
                {refund.amount} {refund.currency}
                {refund.reason ? ` · ${refund.reason}` : ""}
                <span className="text-muted-foreground"> · {formatWhen(refund.createdAt)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
