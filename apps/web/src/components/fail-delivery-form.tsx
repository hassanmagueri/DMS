"use client";

import { useState } from "react";
import { Hand, House, MapPinOff, Route } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";

const reasons = [
  { value: "NOBODY_HOME", label: "Nobody home", hint: "No one answered", icon: House },
  { value: "WRONG_ADDRESS", label: "Wrong address", hint: "The address does not match", icon: MapPinOff },
  { value: "REFUSED", label: "Refused", hint: "The customer refused the parcel", icon: Hand },
  { value: "UNREACHABLE", label: "Unreachable", hint: "The stop could not be reached", icon: Route },
] as const;

export function FailDeliveryForm({
  busy,
  onConfirm,
}: {
  busy: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(reasons[0].value);

  return (
    <>
      <Button
        type="button"
        className="bg-red-600 text-white hover:bg-red-700"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        Mark as failed
      </Button>
      <FormDialog open={open} title="Why did this stop fail?" onClose={() => setOpen(false)}>
        <p className="text-sm text-muted-foreground">Choose a reason, then submit. A dispatcher can send the delivery out again.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {reasons.map((item) => {
            const selected = reason === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setReason(item.value)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected ? "border-foreground bg-background shadow-sm" : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={busy}
            onClick={() => {
              onConfirm(reason);
              setOpen(false);
            }}
          >
            Submit
          </Button>
        </div>
      </FormDialog>
    </>
  );
}
