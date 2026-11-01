"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { personName } from "@/lib/format";
import type { Driver } from "@/types/domain";

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores"),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
  licenseNumber: z.string().trim().min(3),
});

const editSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  licenseNumber: z.string().trim().min(3),
  status: z.enum(["AVAILABLE", "OFFLINE"]),
  enabled: z.boolean(),
  password: z.union([z.string().min(8), z.literal("")]),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

const emptyCreate: CreateValues = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  licenseNumber: "",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: emptyCreate });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { ...emptyCreate, status: "AVAILABLE", enabled: true, password: "" },
  });

  function load() {
    setLoading(true);
    api<Driver[]>("/api/drivers")
      .then(setDrivers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(driver: Driver) {
    setEditing(driver);
    editForm.reset({
      firstName: driver.user.firstName,
      lastName: driver.user.lastName,
      email: driver.user.email,
      phone: driver.user.phone,
      licenseNumber: driver.licenseNumber,
      status: driver.status === "OFFLINE" ? "OFFLINE" : "AVAILABLE",
      enabled: driver.user.enabled,
      password: "",
    });
  }

  async function onCreate(values: CreateValues) {
    try {
      await api("/api/drivers", { method: "POST", body: JSON.stringify(values) });
      toast.success("Driver created");
      createForm.reset(emptyCreate);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the driver");
    }
  }

  async function onEdit(values: EditValues) {
    if (!editing) return;
    try {
      const body = { ...values, password: values.password || undefined };
      await api(`/api/drivers/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Driver updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the driver");
    }
  }

  async function remove(driver: Driver) {
    if (!window.confirm(`Delete ${personName(driver.user)}? This removes the driver account.`)) return;
    try {
      await api(`/api/drivers/${driver.id}`, { method: "DELETE" });
      toast.success("Driver deleted");
      if (editing?.id === driver.id) setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the driver");
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Drivers</h2>
        <p className="text-sm text-muted-foreground">
          Administrators and dispatchers can create, update, and delete driver accounts.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={createForm.handleSubmit(onCreate)}>
        <div className="space-y-2"><Label>First name</Label><Input {...createForm.register("firstName")} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input {...createForm.register("lastName")} /></div>
        <div className="space-y-2"><Label>Username</Label><Input {...createForm.register("username")} /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" {...createForm.register("email")} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input {...createForm.register("phone")} /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" {...createForm.register("password")} /></div>
        <div className="space-y-2"><Label>License</Label><Input {...createForm.register("licenseNumber")} /></div>
        <div className="flex items-end">
          <Button type="submit" disabled={createForm.formState.isSubmitting}>Create driver</Button>
        </div>
      </form>

      {editing ? (
        <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={editForm.handleSubmit(onEdit)}>
          <div className="md:col-span-4">
            <h3 className="font-medium">Edit {personName(editing.user)}</h3>
            <p className="text-xs text-muted-foreground">Username {editing.user.username}. Leave the password blank to keep it.</p>
          </div>
          <div className="space-y-2"><Label>First name</Label><Input {...editForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...editForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...editForm.register("email")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...editForm.register("phone")} /></div>
          <div className="space-y-2"><Label>License</Label><Input {...editForm.register("licenseNumber")} /></div>
          <div className="space-y-2"><Label>New password</Label><Input type="password" {...editForm.register("password")} /></div>
          <div className="space-y-2">
            <Label>Availability</Label>
            <Select value={editForm.watch("status")} onValueChange={(value) => editForm.setValue("status", value as EditValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                <SelectItem value="OFFLINE">OFFLINE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Account</Label>
            <Select
              value={editForm.watch("enabled") ? "enabled" : "disabled"}
              onValueChange={(value) => editForm.setValue("enabled", value === "enabled")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={editForm.formState.isSubmitting}>Save driver</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {drivers.length === 0 ? <EmptyBlock title="No drivers" body="Create the first driver account above." /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <div className="font-medium">{personName(driver.user)}</div>
                  <div className="text-xs text-muted-foreground">
                    {driver.user.email}
                    {driver.user.enabled ? "" : " · Disabled"}
                  </div>
                </TableCell>
                <TableCell>{driver.licenseNumber}</TableCell>
                <TableCell><StatusBadge status={driver.status} /></TableCell>
                <TableCell>
                  {driver.vehicle ? `${driver.vehicle.brand} ${driver.vehicle.model} · ${driver.vehicle.plateNumber}` : "—"}
                </TableCell>
                <TableCell>{driver.activeDeliveries}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" onClick={() => startEdit(driver)}>Edit</Button>
                  <Button variant="destructive" onClick={() => remove(driver)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
