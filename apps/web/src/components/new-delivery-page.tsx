"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedAddressPicker, type SavedAddress } from "@/components/saved-address-picker";
import { api, ApiError } from "@/lib/api";
import { personName } from "@/lib/format";
import type { Customer, Delivery } from "@/types/domain";

type AddressForm = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyAddress: AddressForm = { street: "", city: "", state: "", postalCode: "", country: "USA" };

function AddressFields({
  title,
  value,
  onChange,
  saved,
}: {
  title: string;
  value: AddressForm;
  onChange: (value: AddressForm) => void;
  saved: SavedAddress[];
}) {
  function set(field: keyof AddressForm, next: string) {
    onChange({ ...value, [field]: next });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <SavedAddressPicker
        addresses={saved}
        onPick={(address) =>
          onChange({
            street: address.street,
            city: address.city,
            state: address.state ?? "",
            postalCode: address.postalCode ?? "",
            country: address.country,
          })
        }
      />
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

export default function NewDeliveryPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [weight, setWeight] = useState("");
  const [pickup, setPickup] = useState<AddressForm>(emptyAddress);
  const [dropoff, setDropoff] = useState<AddressForm>(emptyAddress);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadCustomers() {
    setLoading(true);
    api<Customer[]>("/api/customers")
      .then((rows) => {
        setCustomers(rows.filter((customer) => customer.enabled));
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (!customerId) {
      setSaved([]);
      return;
    }
    api<SavedAddress[]>(`/api/addresses?customerId=${customerId}`)
      .then(setSaved)
      .catch(() => setSaved([]));
  }, [customerId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await api<Delivery>("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          customerId: Number(customerId),
          weight: Number(weight),
          pickup,
          dropoff,
        }),
      });
      toast.success(`Delivery #${created.id} created`);
      router.push(`/deliveries/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the delivery");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading customers..." />;
  if (error) return <ErrorBlock message={error} onRetry={loadCustomers} />;

  return (
    <form className="mx-auto max-w-3xl space-y-4" onSubmit={onSubmit}>
      <PageHeader title="New delivery" description="Choose a customer and the pickup and drop-off addresses." />
      {customers.length === 0 ? (
        <ErrorBlock message="No enabled customers are available." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {personName(customer)} · {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </div>
          </div>
          <AddressFields title="Pickup" value={pickup} onChange={setPickup} saved={saved} />
          <AddressFields title="Drop-off" value={dropoff} onChange={setDropoff} saved={saved} />
          <Button type="submit" disabled={submitting || !customerId}>
            {submitting ? "Saving..." : "Create delivery"}
          </Button>
        </>
      )}
    </form>
  );
}
