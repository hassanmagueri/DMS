"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import type { SavedAddress } from "@/components/saved-address-picker";

const empty = { label: "", street: "", city: "", state: "", postalCode: "", country: "USA" };

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [draft, setDraft] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api<SavedAddress[]>("/api/addresses")
      .then((rows) => {
        setAddresses(rows);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function set(field: keyof typeof empty, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await api<SavedAddress>("/api/addresses", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setAddresses((current) => [...current, created].sort((a, b) => a.label.localeCompare(b.label)));
      setDraft(empty);
      toast.success("Address saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save the address");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await api(`/api/addresses/${id}`, { method: "DELETE" });
      setAddresses((current) => current.filter((address) => address.id !== id));
      toast.success("Address removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the address");
    }
  }

  if (loading) return <LoadingBlock label="Loading addresses..." />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Addresses" description="Save the places you send from and deliver to. A new request can pick one of these." />
      <form className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2" onSubmit={save}>
        <div className="space-y-2 sm:col-span-2">
          <Label>Name</Label>
          <Input value={draft.label} onChange={(event) => set("label", event.target.value)} placeholder="Home, work, shop" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Street</Label>
          <Input value={draft.street} onChange={(event) => set("street", event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={draft.city} onChange={(event) => set("city", event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input value={draft.state} onChange={(event) => set("state", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Postal code</Label>
          <Input value={draft.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={draft.country} onChange={(event) => set("country", event.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save address"}</Button>
        </div>
      </form>
      {addresses.length === 0 ? (
        <EmptyBlock title="No saved addresses" body="Add a home or work address above. It will be ready the next time you request a delivery." />
      ) : (
        <div className="space-y-2">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <div>
                <p className="font-medium">{address.label}</p>
                <p className="text-sm text-muted-foreground">
                  {[address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ")}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => remove(address.id)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
