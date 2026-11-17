"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWhen } from "@/lib/format";

export function DeliveryCode({ code }: { code: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold tracking-[0.35em]">{code}</p>
        <p className="text-sm text-muted-foreground">
          Give this code to the driver when the parcel arrives. The delivery cannot be marked delivered without it.
        </p>
      </CardContent>
    </Card>
  );
}

export function DeliveryConfirmation({
  confirmedAt,
  confirmedBy,
}: {
  confirmedAt: string;
  confirmedBy: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof of delivery</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        Confirmed {formatWhen(confirmedAt)}
        {confirmedBy ? ` by ${confirmedBy}` : ""}.
      </CardContent>
    </Card>
  );
}

export function ConfirmDeliveryForm({
  busy,
  onConfirm,
}: {
  busy: boolean;
  onConfirm: (code: string) => void;
}) {
  const fieldId = useId();
  const [code, setCode] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(code);
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={fieldId}>Customer code</Label>
        <Input
          id={fieldId}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-32 tracking-[0.2em]"
        />
      </div>
      <Button type="submit" disabled={busy || code.length !== 6}>
        Confirm delivery
      </Button>
    </form>
  );
}
