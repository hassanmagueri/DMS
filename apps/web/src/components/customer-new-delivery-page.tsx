"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import type { Delivery } from "@/types/domain";

const schema = z.object({
  weight: z.number().positive("Weight must be greater than 0"),
  pickupStreet: z.string().trim().min(1, "Street is required"),
  pickupCity: z.string().trim().min(1, "City is required"),
  pickupCountry: z.string().trim().min(1, "Country is required"),
  dropoffStreet: z.string().trim().min(1, "Street is required"),
  dropoffCity: z.string().trim().min(1, "City is required"),
  dropoffCountry: z.string().trim().min(1, "Country is required"),
});

type FormValues = z.infer<typeof schema>;

export default function CustomerNewDeliveryPage() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      weight: 1,
      pickupStreet: "",
      pickupCity: "",
      pickupCountry: "USA",
      dropoffStreet: "",
      dropoffCity: "",
      dropoffCountry: "USA",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const created = await api<Delivery>("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          weight: values.weight,
          pickup: { street: values.pickupStreet, city: values.pickupCity, country: values.pickupCountry },
          dropoff: { street: values.dropoffStreet, city: values.dropoffCity, country: values.dropoffCountry },
        }),
      });
      toast.success(`Request #${created.id} created`);
      router.push(`/customer/${created.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create the delivery");
    }
  }

  const field = (name: keyof FormValues, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} step={type === "number" ? "0.1" : undefined} {...form.register(name, type === "number" ? { valueAsNumber: true } : undefined)} />
      {form.formState.errors[name] ? (
        <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>
      ) : null}
    </div>
  );

  return (
    <form className="mx-auto max-w-3xl space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <h2 className="text-2xl font-semibold">New delivery request</h2>
        <p className="text-sm text-muted-foreground">The request stays pending until a dispatcher assigns a driver.</p>
      </div>
      {field("weight", "Weight (kg)", "number")}
      <fieldset className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Pickup</legend>
        {field("pickupStreet", "Street")}
        {field("pickupCity", "City")}
        {field("pickupCountry", "Country")}
      </fieldset>
      <fieldset className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Drop-off</legend>
        {field("dropoffStreet", "Street")}
        {field("dropoffCity", "City")}
        {field("dropoffCountry", "Country")}
      </fieldset>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Submit request"}
      </Button>
    </form>
  );
}
