"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { paymentStatusLabel, type PaymentRecord } from "@/types/payment";

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PaymentRecord[]>("/api/payments/mine")
      .then(setPayments)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (payments.length === 0) return <EmptyBlock title="No payments" body="A payment is created when you confirm pay on delivery." />;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Payments" description="Cash due to the driver when the parcel is handed over." />
      <div className="space-y-2">
        {payments.map((payment) => (
          <Link key={payment.id} href={`/customer/payments/${payment.id}`} className="block rounded-xl border p-4 hover:bg-muted/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {payment.amount} {payment.currency}
                </p>
                <p className="text-sm text-muted-foreground">
                  Delivery #{payment.deliveryId} · {formatWhen(payment.createdAt)}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{paymentStatusLabel(payment.status)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
