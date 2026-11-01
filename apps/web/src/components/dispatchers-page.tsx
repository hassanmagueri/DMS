"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
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
import type { Dispatcher } from "@/types/domain";

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores"),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
});

const editSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
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
};

export default function DispatchersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [editing, setEditing] = useState<Dispatcher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: emptyCreate });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", enabled: true, password: "" },
  });

  function load() {
    setLoading(true);
    api<Dispatcher[]>("/api/dispatchers")
      .then(setDispatchers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(dispatcher: Dispatcher) {
    setEditing(dispatcher);
    editForm.reset({
      firstName: dispatcher.firstName,
      lastName: dispatcher.lastName,
      email: dispatcher.email,
      phone: dispatcher.phone,
      enabled: dispatcher.enabled,
      password: "",
    });
  }

  async function onCreate(values: CreateValues) {
    try {
      await api("/api/dispatchers", { method: "POST", body: JSON.stringify(values) });
      toast.success("Dispatcher created");
      createForm.reset(emptyCreate);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the dispatcher");
    }
  }

  async function onEdit(values: EditValues) {
    if (!editing) return;
    try {
      const body = { ...values, password: values.password || undefined };
      await api(`/api/dispatchers/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Dispatcher updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the dispatcher");
    }
  }

  async function remove(dispatcher: Dispatcher) {
    if (!window.confirm(`Delete ${personName(dispatcher)}? This removes the dispatcher account.`)) return;
    try {
      await api(`/api/dispatchers/${dispatcher.id}`, { method: "DELETE" });
      toast.success("Dispatcher deleted");
      if (editing?.id === dispatcher.id) setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the dispatcher");
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dispatchers</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Administrators create, update, and delete dispatcher accounts."
            : "Dispatcher accounts are managed by an administrator."}
        </p>
      </div>

      {isAdmin ? (
        <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={createForm.handleSubmit(onCreate)}>
          <div className="space-y-2"><Label>First name</Label><Input {...createForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...createForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Username</Label><Input {...createForm.register("username")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...createForm.register("email")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...createForm.register("phone")} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" {...createForm.register("password")} /></div>
          <div className="flex items-end md:col-span-2">
            <Button type="submit" disabled={createForm.formState.isSubmitting}>Create dispatcher</Button>
          </div>
        </form>
      ) : null}

      {isAdmin && editing ? (
        <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={editForm.handleSubmit(onEdit)}>
          <div className="md:col-span-4">
            <h3 className="font-medium">Edit {personName(editing)}</h3>
            <p className="text-xs text-muted-foreground">Username {editing.username}. Leave the password blank to keep it.</p>
          </div>
          <div className="space-y-2"><Label>First name</Label><Input {...editForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...editForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...editForm.register("email")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...editForm.register("phone")} /></div>
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
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={editForm.formState.isSubmitting}>Save dispatcher</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {dispatchers.length === 0 ? (
        <EmptyBlock title="No dispatchers" body="No user has the DISPATCHER role." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispatcher</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin ? <TableHead></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispatchers.map((dispatcher) => (
              <TableRow key={dispatcher.id}>
                <TableCell>
                  <div className="font-medium">{personName(dispatcher)}</div>
                  <div className="text-xs text-muted-foreground">{dispatcher.email}</div>
                </TableCell>
                <TableCell>{dispatcher.username}</TableCell>
                <TableCell>{dispatcher.phone}</TableCell>
                <TableCell>
                  <StatusBadge status={dispatcher.enabled ? dispatcher.status : "DISABLED"} />
                </TableCell>
                {isAdmin ? (
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" onClick={() => startEdit(dispatcher)}>Edit</Button>
                    <Button variant="destructive" onClick={() => remove(dispatcher)}>Delete</Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
