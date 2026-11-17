"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/providers";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
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
import type { User } from "@/types/domain";

const schema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    username: z.string().trim().min(3),
    email: z.string().trim(),
    phone: z.string().trim().min(6),
    password: z.string().min(8),
    role: z.enum(["CUSTOMER", "DISPATCHER", "DRIVER", "ADMIN"]),
    licenseNumber: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const optional = value.role === "DISPATCHER" || value.role === "DRIVER";
    if (!value.email) {
      if (!optional) ctx.addIssue({ code: "custom", path: ["email"], message: "Enter an email" });
      return;
    }
    if (!z.string().email().safeParse(value.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email" });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const confirm = useConfirm();
  const { user: current } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "CUSTOMER", firstName: "", lastName: "", username: "", email: "", phone: "", password: "" },
  });

  function load() {
    setLoading(true);
    api<User[]>("/api/users")
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(values: FormValues) {
    try {
      const staff = values.role === "DISPATCHER" || values.role === "DRIVER";
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...values, email: staff ? undefined : values.email || undefined }),
      });
      toast.success("User created");
      form.reset({ role: "CUSTOMER", firstName: "", lastName: "", username: "", email: "", phone: "", password: "" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the user");
    }
  }

  async function toggle(user: User) {
    const blocking = user.enabled;
    const accepted = await confirm({
      title: blocking ? `Block ${personName(user)}?` : `Unblock ${personName(user)}?`,
      body: blocking
        ? "They will be signed out and cannot sign in until you unblock them."
        : "They will be able to sign in again.",
      confirmLabel: blocking ? "Block account" : "Unblock account",
    });
    if (!accepted) return;
    try {
      await api(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      toast.success(blocking ? "Account blocked" : "Account unblocked");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the user");
    }
  }

  async function remove(user: User) {
    const accepted = await confirm({
      title: `Remove ${personName(user)}?`,
      body: "This deletes the account. A driver can be removed after every delivery is finished. A customer who still has deliveries cannot be removed.",
      confirmLabel: "Remove account",
    });
    if (!accepted) return;
    try {
      await api(`/api/users/${user.id}`, { method: "DELETE" });
      toast.success("Account removed");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the account");
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((account) =>
      [personName(account), account.email, account.username, account.role, account.enabled ? "active" : "blocked"]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, query]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Create accounts, block sign-in, or remove an account that has no deliveries." />
      <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={form.handleSubmit(onCreate)}>
        <div className="space-y-2"><Label>First name</Label><Input {...form.register("firstName")} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input {...form.register("lastName")} /></div>
        <div className="space-y-2"><Label>Username</Label><Input {...form.register("username")} /></div>
        {form.watch("role") === "CUSTOMER" || form.watch("role") === "ADMIN" ? (
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
        ) : null}
        <div className="space-y-2"><Label>Phone</Label><Input {...form.register("phone")} /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" {...form.register("password")} /></div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={form.watch("role")}
            onValueChange={(value) => {
              form.setValue("role", value as FormValues["role"]);
              if (value === "DISPATCHER" || value === "DRIVER") form.setValue("email", "");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["CUSTOMER", "DISPATCHER", "DRIVER", "ADMIN"].map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.watch("role") === "DRIVER" ? (
          <div className="space-y-2"><Label>License</Label><Input {...form.register("licenseNumber")} /></div>
        ) : null}
        <div className="md:col-span-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>Create user</Button>
        </div>
      </form>
      <TableFilter value={query} onChange={setQuery} placeholder="Filter users" />
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">Nothing matches this filter.</p> : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium">
                  <Link className="text-primary" href={`/people/${user.id}`}>
                    {personName(user)}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">{user.email ?? "No email yet"}</div>
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell><StatusBadge status={user.enabled ? "ACTIVE" : "BLOCKED"} /></TableCell>
              <TableCell className="space-x-2 text-right">
                {current?.id === user.id ? (
                  <span className="text-xs text-muted-foreground">Your account</span>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => toggle(user)}>
                      {user.enabled ? "Block" : "Unblock"}
                    </Button>
                    <Button variant="destructive" onClick={() => remove(user)}>Remove</Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
