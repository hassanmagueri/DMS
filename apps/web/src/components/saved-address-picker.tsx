"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SavedAddress = {
  id: number;
  label: string;
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
};

export function SavedAddressPicker({
  addresses,
  onPick,
}: {
  addresses: SavedAddress[];
  onPick: (address: SavedAddress) => void;
}) {
  if (addresses.length === 0) {
    return <p className="text-xs text-muted-foreground">No saved addresses yet.</p>;
  }
  return (
    <Select
      onValueChange={(value) => {
        const found = addresses.find((address) => String(address.id) === value);
        if (found) onPick(found);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Use a saved address" />
      </SelectTrigger>
      <SelectContent>
        {addresses.map((address) => (
          <SelectItem key={address.id} value={String(address.id)}>
            {address.label} · {address.street}, {address.city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
