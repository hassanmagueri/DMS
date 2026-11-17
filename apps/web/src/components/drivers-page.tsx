"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
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
import { StarRating } from "@/components/star-rating";
import { personName } from "@/lib/format";
import type { Driver, DriverPage } from "@/types/domain";

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores"),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
  licenseNumber: z.string().trim().min(3),
});

const editSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.union([z.string().trim().email(), z.literal("")]),
  phone: z.string().trim().min(6),
  licenseNumber: z.string().trim().min(3),
  enabled: z.boolean(),
  password: z.union([z.string().min(8), z.literal("")]),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

const emptyCreate: CreateValues = {
  firstName: "",
  lastName: "",
  username: "",
  phone: "",
  password: "",
  licenseNumber: "",
};

export default function DriversPage() {
  const confirm = useConfirm();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: emptyCreate });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { ...emptyCreate, enabled: true, password: "" },
  });

  function load(nextPage = page, nextQuery = query) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "20" });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    api<DriverPage>(`/api/drivers?${params.toString()}`)
      .then((data) => {
        setDrivers(data.items);
        setPage(data.page);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setReady(true);
      });
  }

  useEffect(() => {
    const handle = window.setTimeout(() => load(1, query), 250);
    return () => window.clearTimeout(handle);
    // Search resets to the first page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function startEdit(driver: Driver) {
    setEditing(driver);
    editForm.reset({
      firstName: driver.user.firstName,
      lastName: driver.user.lastName,
      email: driver.user.email ?? "",
      phone: driver.user.phone,
      licenseNumber: driver.licenseNumber,
      enabled: driver.user.enabled,
      password: "",
    });
  }

  async function onCreate(values: CreateValues) {
    try {
      await api("/api/drivers", {
        method: "POST",
        body: JSON.stringify(values),
      });
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
      const body = { ...values, email: values.email || undefined, password: values.password || undefined };
      await api(`/api/drivers/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Driver updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the driver");
    }
  }

  async function block(driver: Driver) {
    const blocking = driver.user.enabled;
    const accepted = await confirm({
      title: blocking ? `Block ${personName(driver.user)}?` : `Unblock ${personName(driver.user)}?`,
      body: blocking
        ? "They will be signed out and cannot take new deliveries until you unblock them."
        : "They will be able to sign in again.",
      confirmLabel: blocking ? "Block driver" : "Unblock driver",
    });
    if (!accepted) return;
    try {
      await api(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !driver.user.enabled }),
      });
      toast.success(blocking ? "Driver blocked" : "Driver unblocked");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the driver");
    }
  }

  async function remove(driver: Driver) {
    const accepted = await confirm({
      title: `Delete ${personName(driver.user)}?`,
      body: "This removes the driver account. A driver with a delivery still in progress cannot be deleted. Finished deliveries stay on record.",
      confirmLabel: "Delete driver",
    });
    if (!accepted) return;
    try {
      await api(`/api/drivers/${driver.id}`, { method: "DELETE" });
      toast.success("Driver deleted");
      if (editing?.id === driver.id) setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the driver");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (!ready && loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers" description="A signed-in driver is Available, or On delivery while a stop is active. Signing out sets them Offline. You can remove a driver after every delivery is finished." />

      <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={createForm.handleSubmit(onCreate)}>
        <div className="space-y-2"><Label>First name</Label><Input {...createForm.register("firstName")} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input {...createForm.register("lastName")} /></div>
        <div className="space-y-2"><Label>Username</Label><Input {...createForm.register("username")} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input {...createForm.register("phone")} /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" {...createForm.register("password")} /></div>
        <div className="space-y-2"><Label>License</Label><Input {...createForm.register("licenseNumber")} /></div>
        <div className="flex items-end">
          <Button type="submit" disabled={createForm.formState.isSubmitting}>Create driver</Button>
        </div>
      </form>

      <FormDialog
        open={Boolean(editing)}
        title={editing ? `Edit ${personName(editing.user)}` : "Edit driver"}
        onClose={() => setEditing(null)}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={editForm.handleSubmit(onEdit)}>
          <p className="text-xs text-muted-foreground md:col-span-2">
            Username {editing?.user.username}. Leave the password blank to keep it. Availability follows whether this driver is signed in.
          </p>
          <div className="space-y-2"><Label>First name</Label><Input {...editForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...editForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...editForm.register("email")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...editForm.register("phone")} /></div>
          <div className="space-y-2"><Label>License</Label><Input {...editForm.register("licenseNumber")} /></div>
          <div className="space-y-2"><Label>New password</Label><Input type="password" {...editForm.register("password")} /></div>
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
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={editForm.formState.isSubmitting}>Save driver</Button>
          </div>
        </form>
      </FormDialog>

      <TableFilter value={query} onChange={setQuery} placeholder="Search drivers" />
      {drivers.length === 0 ? (
        <EmptyBlock title="No drivers" body={query.trim() ? "Nothing matches this search." : "Create the first driver account above."} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <div className="font-medium">
                    <Link className="text-primary" href={`/people/${driver.user.id}`}>
                      {personName(driver.user)}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {driver.user.email ?? "No email yet"}
                    {driver.user.enabled ? "" : " · Blocked"}
                  </div>
                </TableCell>
                <TableCell>{driver.licenseNumber}</TableCell>
                <TableCell><StatusBadge status={driver.status} /></TableCell>
                <TableCell>
                  <StarRating value={driver.ratingAverage} count={driver.ratingCount} />
                </TableCell>
                <TableCell>
                  {driver.vehicle ? `${driver.vehicle.brand} ${driver.vehicle.model} · ${driver.vehicle.plateNumber}` : "—"}
                </TableCell>
                <TableCell>{driver.activeDeliveries}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" onClick={() => startEdit(driver)}>Edit</Button>
                  <Button variant="outline" onClick={() => block(driver)}>
                    {driver.user.enabled ? "Block" : "Unblock"}
                  </Button>
                  <Button variant="destructive" onClick={() => remove(driver)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {total > 20 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} · {total} drivers
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                load(next);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                load(next);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
