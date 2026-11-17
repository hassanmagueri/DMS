"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/page-state";
import { useAuth } from "@/components/providers";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { personName } from "@/lib/format";

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enabled: boolean;
};

const pageSize = 8;

const editSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
});

type EditValues = z.infer<typeof editSchema>;

export default function CustomersPage() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const canBlock = isAdmin || user?.role === "DISPATCHER";
  const [editing, setEditing] = useState<Customer | null>(null);
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api<Customer[]>("/api/customers"),
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = customers.data ?? [];
    const matched = needle
      ? rows.filter((row) =>
          [personName(row), row.email, row.phone].join(" ").toLowerCase().includes(needle),
        )
      : rows;
    return [...matched].sort((a, b) => personName(a).localeCompare(personName(b)));
  }, [customers.data, query]);

  async function toggle(customer: Customer) {
    const blocking = customer.enabled;
    const accepted = await confirm({
      title: blocking ? `Block ${personName(customer)}?` : `Unblock ${personName(customer)}?`,
      body: blocking
        ? "They will be signed out and cannot request deliveries until you unblock them."
        : "They will be able to sign in again.",
      confirmLabel: blocking ? "Block customer" : "Unblock customer",
    });
    if (!accepted) return;
    try {
      await api(`/api/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !customer.enabled }),
      });
      toast.success(blocking ? "Customer blocked" : "Customer unblocked");
      await customers.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the customer");
    }
  }

  async function remove(customer: Customer) {
    const accepted = await confirm({
      title: `Remove ${personName(customer)}?`,
      body: "This deletes the account. A customer who still has deliveries cannot be removed — block them instead.",
      confirmLabel: "Remove customer",
    });
    if (!accepted) return;
    try {
      if (editing?.id === customer.id) setEditing(null);
      await api(`/api/customers/${customer.id}`, { method: "DELETE" });
      toast.success("Customer removed");
      await customers.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the customer");
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description={
          isAdmin
            ? "Edit or remove a customer. Block stops sign-in and leaves their deliveries on record."
            : "Block a customer to stop sign-in. An administrator edits and removes accounts."
        }
      />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
        placeholder="Search name, email, or phone"
        aria-label="Search customers"
        className="max-w-sm"
      />
      <FormDialog
        open={Boolean(editing) && isAdmin}
        title={editing ? `Edit ${personName(editing)}` : "Edit customer"}
        onClose={() => setEditing(null)}
      >
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={editForm.handleSubmit(async (values) => {
            if (!editing) return;
            try {
              await api(`/api/customers/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) });
              toast.success("Customer updated");
              setEditing(null);
              await customers.refetch();
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Could not update the customer");
            }
          })}
        >
          <div className="space-y-2"><Label>First name</Label><Input {...editForm.register("firstName")} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input {...editForm.register("lastName")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...editForm.register("email")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...editForm.register("phone")} /></div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={editForm.formState.isSubmitting}>Save customer</Button>
          </div>
        </form>
      </FormDialog>
      {customers.isLoading ? <LoadingBlock /> : null}
      {customers.isError ? <ErrorBlock message={customers.error.message} onRetry={() => customers.refetch()} /> : null}
      {customers.data && filtered.length === 0 ? <EmptyBlock title="No customers" body="No account matches this search." /> : null}
      {visible.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Account</TableHead>
                {canBlock ? <TableHead></TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link className="text-primary" href={`/people/${customer.id}`}>
                      {personName(customer)}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <StatusBadge status={customer.enabled ? "ACTIVE" : "BLOCKED"} />
                  </TableCell>
                  {canBlock ? (
                    <TableCell className="space-x-2 text-right">
                      {isAdmin ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(customer);
                            editForm.reset({
                              firstName: customer.firstName,
                              lastName: customer.lastName,
                              email: customer.email,
                              phone: customer.phone,
                            });
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <Button variant="outline" onClick={() => toggle(customer)}>
                        {customer.enabled ? "Block" : "Unblock"}
                      </Button>
                      {isAdmin ? (
                        <Button variant="destructive" onClick={() => remove(customer)}>Remove</Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
