"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { allowedActions, canAssign, canEditDetails, formatAddress, formatWhen, personName, statusLabel } from "@/lib/format";
import type { Delivery, Driver } from "@/types/domain";

type AddressDraft = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function AddressEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AddressDraft;
  onChange: (value: AddressDraft) => void;
}) {
  function set(field: keyof AddressDraft, next: string) {
    onChange({ ...value, [field]: next });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="space-y-2">
        <Label>Street</Label>
        <Input value={value.street} onChange={(event) => set("street", event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={value.city} onChange={(event) => set("city", event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input value={value.state} onChange={(event) => set("state", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Postal code</Label>
          <Input value={value.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={value.country} onChange={(event) => set("country", event.target.value)} required />
        </div>
      </div>
    </fieldset>
  );
}

function draftAddress(address: Delivery["pickup"]): AddressDraft {
  return {
    street: address.street,
    city: address.city,
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country,
  };
}

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [weight, setWeight] = useState("");
  const [pickup, setPickup] = useState<AddressDraft>({ street: "", city: "", state: "", postalCode: "", country: "" });
  const [dropoff, setDropoff] = useState<AddressDraft>({ street: "", city: "", state: "", postalCode: "", country: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([api<Delivery>(`/api/deliveries/${params.id}`), api<Driver[]>("/api/drivers")])
      .then(([row, driverRows]) => {
        setDelivery(row);
        setDrivers(driverRows);
        setDriverId(row.driver ? String(row.driver.id) : "");
        setWeight(String(row.weight));
        setPickup(draftAddress(row.pickup));
        setDropoff(draftAddress(row.dropoff));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function assign() {
    if (!delivery || !driverId) return;
    setBusy(true);
    try {
      const updated = await api<Delivery>(`/api/deliveries/${delivery.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: Number(driverId) }),
      });
      setDelivery(updated);
      toast.success("Driver assigned");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not assign the driver");
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!delivery) return;
    setBusy(true);
    try {
      const updated = await api<Delivery>(`/api/deliveries/${delivery.id}`, {
        method: "PATCH",
        body: JSON.stringify({ weight: Number(weight), pickup, dropoff }),
      });
      setDelivery(updated);
      toast.success("Delivery updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the delivery");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!delivery || !window.confirm(`Delete delivery #${delivery.id}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/deliveries/${delivery.id}`, { method: "DELETE" });
      toast.success("Delivery deleted");
      router.push("/deliveries");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the delivery");
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    if (!delivery) return;
    if (status === "CANCELLED" && !window.confirm("Cancel this delivery?")) return;
    setBusy(true);
    try {
      const updated = await api<Delivery>(`/api/deliveries/${delivery.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setDelivery(updated);
      toast.success(`Status is now ${statusLabel(status)}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the status");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !delivery) return <ErrorBlock message={error ?? "Delivery not found"} onRetry={load} />;

  const choices = drivers.filter(
    (driver) => driver.user.enabled && (driver.status !== "OFFLINE" || driver.id === delivery.driver?.id),
  );
  const actions = allowedActions(delivery.status, "ADMIN");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Delivery #{delivery.id}</h2>
          <p className="text-sm text-muted-foreground">{formatWhen(delivery.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={delivery.status} />
          <Button variant="destructive" disabled={busy} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{personName(delivery.customer)}</p>
            <p>{delivery.customer.email}</p>
            <p>{delivery.customer.phone}</p>
            <p className="pt-2 text-muted-foreground">Weight {delivery.weight} kg</p>
            {delivery.deliveredAt ? <p>Delivered {formatWhen(delivery.deliveredAt)}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Pickup</p>
              <p className="text-muted-foreground">{formatAddress(delivery.pickup)}</p>
            </div>
            <div>
              <p className="font-medium">Drop-off</p>
              <p className="text-muted-foreground">{formatAddress(delivery.dropoff)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {canEditDetails(delivery.status) ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveDetails}>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" min="0.1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} required />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <AddressEditor title="Pickup" value={pickup} onChange={setPickup} />
                <AddressEditor title="Drop-off" value={dropoff} onChange={setDropoff} />
              </div>
              <Button type="submit" disabled={busy}>Save details</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Assignment and status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Driver: {delivery.driver ? `${personName(delivery.driver)} · ${delivery.driver.licenseNumber}` : "Unassigned"}
          </p>
          {canAssign(delivery.status) ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Choose an available driver. The driver must accept the assignment.</p>
              {choices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available drivers.</p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={driverId || undefined} onValueChange={setDriverId}>
                    <SelectTrigger className="sm:w-80">
                      <SelectValue placeholder="Choose a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {choices.map((driver) => (
                        <SelectItem key={driver.id} value={String(driver.id)}>
                          {personName(driver.user)} · {statusLabel(driver.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assign} disabled={busy || !driverId}>
                    Assign driver
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.map((status) => (
              <Button
                key={status}
                variant={status === "CANCELLED" || status === "FAILED" ? "destructive" : "default"}
                disabled={busy}
                onClick={() => changeStatus(status)}
              >
                Mark {statusLabel(status)}
              </Button>
            ))}
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">This delivery cannot move to another status.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {delivery.timeline.length === 0 ? <p className="text-muted-foreground">No recorded changes yet.</p> : null}
          {delivery.timeline.map((event) => (
            <p key={event.id}>
              {formatWhen(event.createdAt)} · {statusLabel(event.toStatus)}
              {event.actor ? ` · ${event.actor}` : ""}
              {event.note ? ` · ${event.note}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
