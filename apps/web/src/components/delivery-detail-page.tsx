"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { ConfirmDeliveryForm } from "@/components/delivery-proof";
import { FailDeliveryForm } from "@/components/fail-delivery-form";
import { useAuth } from "@/components/providers";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { StarRating } from "@/components/star-rating";
import { allowedActions, canAssign, canEditDetails, failureReasonLabel, formatAddress, formatWhen, personName, statusLabel } from "@/lib/format";
import { deliveryPayLabel } from "@/types/payment";
import type { Delivery, Driver, DriverPage } from "@/types/domain";

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
  const confirm = useConfirm();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverQuery, setDriverQuery] = useState("");
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
    api<Delivery>(`/api/deliveries/${params.id}`)
      .then((row) => {
        setDelivery(row);
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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ page: "1", pageSize: "20", assignable: "1" });
      if (driverQuery.trim()) params.set("q", driverQuery.trim());
      api<DriverPage>(`/api/drivers?${params.toString()}`)
        .then((data) => setDrivers(data.items))
        .catch(() => setDrivers([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [driverQuery]);

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
    if (!delivery) return;
    const accepted = await confirm({
      title: `Delete delivery #${delivery.id}?`,
      body: "This removes the delivery and its history.",
      confirmLabel: "Delete delivery",
    });
    if (!accepted) return;
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

  async function changeStatus(status: string, confirmationCode?: string, failureReason?: string) {
    if (!delivery) return;
    if (status === "CANCELLED") {
      const accepted = await confirm({
        title: "Cancel this delivery?",
        body: "The delivery leaves the active queue.",
        confirmLabel: "Cancel delivery",
      });
      if (!accepted) return;
    }
    setBusy(true);
    try {
      const updated = await api<Delivery>(`/api/deliveries/${delivery.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, confirmationCode, failureReason }),
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
          {canManage ? (
            <Button variant="destructive" disabled={busy} onClick={remove}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">
              <Link className="text-primary" href={`/people/${delivery.customer.id}`}>
                {personName(delivery.customer)}
              </Link>
            </p>
            <p>{delivery.customer.email}</p>
            <p>{delivery.customer.phone}</p>
            <p className="pt-2 text-muted-foreground">Weight {delivery.weight} kg</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-muted-foreground">Pay</span>
              <StatusBadge
                status={delivery.payment?.status ?? "PENDING"}
                label={deliveryPayLabel(delivery.payment)}
              />
              {delivery.payment ? (
                <span>
                  {delivery.payment.amount} {delivery.payment.currency}
                </span>
              ) : (
                <span className="text-muted-foreground">Pay the driver in cash when the parcel arrives.</span>
              )}
            </div>
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
      {canAssign(delivery.status) ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose a driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {delivery.driver
                ? `Currently assigned to ${personName(delivery.driver)}. Pick another driver to reassign.`
                : "This delivery is waiting for a driver. The driver must accept the assignment."}
            </p>
            <Input value={driverQuery} onChange={(event) => setDriverQuery(event.target.value)} placeholder="Search drivers by name, email, or license" />
            {choices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available drivers.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((driver) => {
                  const selected = driverId === String(driver.id);
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => setDriverId(String(driver.id))}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="block font-medium">{personName(driver.user)}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {driver.licenseNumber} · {statusLabel(driver.status)}
                      </span>
                      <span className="mt-1 block">
                        <StarRating value={driver.ratingAverage} count={driver.ratingCount} />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {driver.vehicle
                          ? `${driver.vehicle.brand} ${driver.vehicle.model} · ${driver.vehicle.plateNumber}`
                          : "No vehicle"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <Button onClick={assign} disabled={busy || !driverId || driverId === String(delivery.driver?.id ?? "")}>
              {delivery.driver ? "Reassign driver" : "Assign driver"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {canManage && canEditDetails(delivery.status) ? (
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
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Driver:{" "}
            {delivery.driver ? (
              <Link className="text-primary" href={`/people/${delivery.driver.userId}`}>
                {personName(delivery.driver)} · {delivery.driver.licenseNumber}
              </Link>
            ) : (
              "Unassigned"
            )}
          </p>
          {delivery.proof.confirmedAt ? (
            <p className="text-sm text-muted-foreground">
              Proof of delivery confirmed {formatWhen(delivery.proof.confirmedAt)}
              {delivery.proof.confirmedBy ? ` by ${delivery.proof.confirmedBy}` : ""}.
            </p>
          ) : null}
          {delivery.failureReason ? (
            <p className="text-sm">Last failure: {failureReasonLabel(delivery.failureReason)}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {actions
              .filter((status) => status !== "DELIVERED" && status !== "FAILED")
              .map((status) => (
              <Button
                key={status}
                variant={status === "CANCELLED" ? "destructive" : "default"}
                disabled={busy}
                onClick={() => changeStatus(status)}
              >
                {status === "PENDING" ? "Send again" : `Mark ${statusLabel(status)}`}
              </Button>
            ))}
            {actions.includes("FAILED") ? (
              <FailDeliveryForm busy={busy} onConfirm={(reason) => changeStatus("FAILED", undefined, reason)} />
            ) : null}
            {actions.includes("DELIVERED") ? (
              <ConfirmDeliveryForm busy={busy} onConfirm={(code) => changeStatus("DELIVERED", code)} />
            ) : null}
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
