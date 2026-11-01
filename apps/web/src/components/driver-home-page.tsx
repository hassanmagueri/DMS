"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { allowedActions, formatAddress, personName, statusLabel } from "@/lib/format";
import type { Delivery, Driver } from "@/types/domain";

type DriverHome = { driver: Driver; deliveries: Delivery[] };

export default function DriverPage() {
  const [home, setHome] = useState<DriverHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    api<DriverHome>("/api/drivers/me")
      .then(setHome)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(delivery: Delivery, status: string) {
    setBusyId(delivery.id);
    try {
      const updated = await api<Delivery>(`/api/deliveries/${delivery.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setHome((current) =>
        current
          ? {
              ...current,
              deliveries: current.deliveries.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current,
      );
      toast.success(`Delivery #${delivery.id} is ${statusLabel(status)}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the status");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !home) return <ErrorBlock message={error ?? "Could not load your deliveries"} onRetry={load} />;

  const active = home.deliveries.filter((delivery) =>
    ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"].includes(delivery.status),
  );
  const done = home.deliveries.filter(
    (delivery) => !["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"].includes(delivery.status),
  );

  async function respond(delivery: Delivery, accept: boolean) {
    if (!accept && !window.confirm("Reject this assignment? It returns to the dispatcher queue.")) return;
    setBusyId(delivery.id);
    try {
      await api(`/api/deliveries/${delivery.id}/${accept ? "accept" : "reject"}`, { method: "POST" });
      toast.success(accept ? "Assignment accepted" : "Assignment rejected");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the assignment");
    } finally {
      setBusyId(null);
    }
  }

  function shareLocation() {
    if (!navigator.geolocation) {
      toast.error("This browser cannot share a location");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api("/api/drivers/me/location", {
            method: "POST",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          toast.success("Location shared");
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : "Could not share location");
        }
      },
      () => toast.error("Location permission was denied"),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{personName(home.driver.user)}</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{home.driver.licenseNumber}</span>
          <StatusBadge status={home.driver.status} />
          <Button variant="outline" onClick={shareLocation}>
            Share location
          </Button>
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-lg font-medium">Assigned to me</h3>
        {active.length === 0 ? (
          <EmptyBlock title="No active deliveries" body="New assignments will show up here." />
        ) : (
          active.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>#{delivery.id}</span>
                  <StatusBadge status={delivery.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>Customer: {personName(delivery.customer)}</p>
                <p>Pickup: {formatAddress(delivery.pickup)}</p>
                <p>Drop-off: {formatAddress(delivery.dropoff)}</p>
                <p>Weight: {delivery.weight} kg</p>
                <div className="flex flex-wrap gap-2">
                  {delivery.status === "ASSIGNED" ? (
                    <>
                      <Button disabled={busyId === delivery.id} onClick={() => respond(delivery, true)}>
                        Accept
                      </Button>
                      <Button variant="destructive" disabled={busyId === delivery.id} onClick={() => respond(delivery, false)}>
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {allowedActions(delivery.status, "DRIVER").map((status) => (
                    <Button
                      key={status}
                      variant={status === "FAILED" ? "destructive" : "default"}
                      disabled={busyId === delivery.id}
                      onClick={() => changeStatus(delivery, status)}
                    >
                      Mark {statusLabel(status)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-medium">Completed and closed</h3>
        {done.length === 0 ? (
          <EmptyBlock title="No completed deliveries" body="Delivered, failed, and cancelled jobs appear here." />
        ) : (
          done.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>#{delivery.id}</span>
                  <StatusBadge status={delivery.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {delivery.pickup.city} → {delivery.dropoff.city}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
