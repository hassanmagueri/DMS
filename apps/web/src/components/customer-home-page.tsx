"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import type { DeliveryPage } from "@/types/domain";

const ACTIVE = ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

export default function CustomerHomePage() {
  const [data, setData] = useState<DeliveryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load(nextPage = 1) {
    setLoading(true);
    api<DeliveryPage>(`/api/deliveries/mine?page=${nextPage}&pageSize=20`)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "Could not load deliveries"} onRetry={load} />;

  const pending = data.items.filter((item) => item.status === "PENDING" || item.status === "REJECTED").length;
  const active = data.items.filter((item) => ACTIVE.includes(item.status)).length;
  const delivered = data.items.filter((item) => item.status === "DELIVERED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Requests you have submitted."
        action={
          <Button asChild>
            <Link href="/customer/new">New request</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total", data.total],
          ["Waiting", pending],
          ["Active", active],
          ["Delivered", delivered],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have not requested a delivery yet.</p>
        ) : (
          data.items.map((delivery) => (
            <Link key={delivery.id} href={`/customer/${delivery.id}`} className="block rounded-xl border p-4 hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Delivery #{delivery.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.pickup.city} → {delivery.dropoff.city} · {formatWhen(delivery.createdAt)}
                  </p>
                </div>
                <StatusBadge status={delivery.status} />
              </div>
            </Link>
          ))
        )}
      </div>
      {data.total > data.pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))} · {data.total} deliveries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => {
                load(data.page - 1);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={data.page * data.pageSize >= data.total}
              onClick={() => {
                load(data.page + 1);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
