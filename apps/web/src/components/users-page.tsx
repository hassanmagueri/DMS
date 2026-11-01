"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
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
import type { User } from "@/types/domain";

const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  username: z.string().trim().min(3),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
  role: z.enum(["CUSTOMER", "DISPATCHER", "DRIVER", "ADMIN"]),
  licenseNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
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
      await api("/api/users", { method: "POST", body: JSON.stringify(values) });
      toast.success("User created");
      form.reset({ role: "CUSTOMER", firstName: "", lastName: "", username: "", email: "", phone: "", password: "" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the user");
    }
  }

  async function toggle(user: User) {
    try {
      await api(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !user.enabled, status: user.enabled ? "DISABLED" : "ACTIVE" }),
      });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the user");
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">Administrators create accounts and can disable them. Passwords are hashed.</p>
      </div>
      <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={form.handleSubmit(onCreate)}>
        <div className="space-y-2"><Label>First name</Label><Input {...form.register("firstName")} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input {...form.register("lastName")} /></div>
        <div className="space-y-2"><Label>Username</Label><Input {...form.register("username")} /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" {...form.register("email")} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input {...form.register("phone")} /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" {...form.register("password")} /></div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as FormValues["role"])}>
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
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium">{personName(user)}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell><StatusBadge status={user.enabled ? user.status : "DISABLED"} /></TableCell>
              <TableCell>
                <Button variant="outline" onClick={() => toggle(user)}>
                  {user.enabled ? "Disable" : "Enable"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
