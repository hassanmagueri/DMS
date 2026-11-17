"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
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
import { personName } from "@/lib/format";
import type { Dispatcher } from "@/types/domain";

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores"),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
});

const editSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.union([z.string().trim().email(), z.literal("")]),
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
  phone: "",
  password: "",
};

export default function DispatchersPage() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [query, setQuery] = useState("");
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
      email: dispatcher.email ?? "",
      phone: dispatcher.phone,
      enabled: dispatcher.enabled,
      password: "",
    });
  }

  async function onCreate(values: CreateValues) {
    try {
      await api("/api/dispatchers", {
        method: "POST",
        body: JSON.stringify(values),
      });
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
      const body = { ...values, email: values.email || undefined, password: values.password || undefined };
      await api(`/api/dispatchers/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Dispatcher updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the dispatcher");
    }
  }

  async function block(dispatcher: Dispatcher) {
    const blocking = dispatcher.enabled;
    const accepted = await confirm({
      title: blocking ? `Block ${personName(dispatcher)}?` : `Unblock ${personName(dispatcher)}?`,
      body: blocking
        ? "They will be signed out and cannot manage deliveries until you unblock them."
        : "They will be able to sign in again.",
      confirmLabel: blocking ? "Block dispatcher" : "Unblock dispatcher",
    });
    if (!accepted) return;
    try {
      await api(`/api/dispatchers/${dispatcher.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !dispatcher.enabled }),
      });
      toast.success(blocking ? "Dispatcher blocked" : "Dispatcher unblocked");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the dispatcher");
    }
  }

  async function remove(dispatcher: Dispatcher) {
    const accepted = await confirm({
      title: `Remove ${personName(dispatcher)}?`,
      body: "This removes the dispatcher account and their sessions.",
      confirmLabel: "Remove dispatcher",
    });
    if (!accepted) return;
    try {
      await api(`/api/dispatchers/${dispatcher.id}`, { method: "DELETE" });
      toast.success("Dispatcher deleted");
      if (editing?.id === dispatcher.id) setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the dispatcher");
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dispatchers;
    return dispatchers.filter((dispatcher) =>
      [personName(dispatcher), dispatcher.username, dispatcher.email, dispatcher.phone, dispatcher.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [dispatchers, query]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatchers"
        description={
          isAdmin
            ? "Create, update, and remove dispatcher accounts."
            : "Dispatcher accounts are managed by an administrator."
        }
      />

      {isAdmin ? (
        <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={createForm.handleSubmit(onCreate)}>
          <div className="space-y-2"><Label>First name</Label><Input {...createForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...createForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Username</Label><Input {...createForm.register("username")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...createForm.register("phone")} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" {...createForm.register("password")} /></div>
          <div className="flex items-end md:col-span-2">
            <Button type="submit" disabled={createForm.formState.isSubmitting}>Create dispatcher</Button>
          </div>
        </form>
      ) : null}

      <FormDialog
        open={Boolean(isAdmin && editing)}
        title={editing ? `Edit ${personName(editing)}` : "Edit dispatcher"}
        onClose={() => setEditing(null)}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={editForm.handleSubmit(onEdit)}>
          <p className="text-xs text-muted-foreground md:col-span-2">
            Username {editing?.username}. Leave the password blank to keep it.
          </p>
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
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={editForm.formState.isSubmitting}>Save dispatcher</Button>
          </div>
        </form>
      </FormDialog>

      <TableFilter value={query} onChange={setQuery} placeholder="Filter dispatchers" />
      {dispatchers.length === 0 ? (
        <EmptyBlock title="No dispatchers" body="No user has the DISPATCHER role." />
      ) : visible.length === 0 ? (
        <EmptyBlock title="No dispatchers" body="Nothing matches this filter." />
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
            {visible.map((dispatcher) => (
              <TableRow key={dispatcher.id}>
                <TableCell>
                  <div className="font-medium">
                    {isAdmin ? (
                      <Link className="text-primary" href={`/people/${dispatcher.id}`}>
                        {personName(dispatcher)}
                      </Link>
                    ) : (
                      personName(dispatcher)
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{dispatcher.email ?? "No email yet"}</div>
                </TableCell>
                <TableCell>{dispatcher.username}</TableCell>
                <TableCell>{dispatcher.phone}</TableCell>
                <TableCell>
                  <StatusBadge status={dispatcher.enabled ? "ACTIVE" : "BLOCKED"} />
                </TableCell>
                {isAdmin ? (
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" onClick={() => startEdit(dispatcher)}>Edit</Button>
                    <Button variant="outline" onClick={() => block(dispatcher)}>
                      {dispatcher.enabled ? "Block" : "Unblock"}
                    </Button>
                    <Button variant="destructive" onClick={() => remove(dispatcher)}>Remove</Button>
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
