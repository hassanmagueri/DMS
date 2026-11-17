"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { TableFilter } from "@/components/table-filter";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers";
import { api, ApiError } from "@/lib/api";
import { personName } from "@/lib/format";
import type { Driver, DriverPage } from "@/types/domain";

type Vehicle = {
  id: number;
  brand: string;
  model: string;
  plateNumber: string;
  type: string;
  driverId: number | null;
  driverName: string | null;
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverQuery, setDriverQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<Vehicle[]>("/api/vehicles")
      .then(setVehicles)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ page: "1", pageSize: "20" });
      if (driverQuery.trim()) params.set("q", driverQuery.trim());
      api<DriverPage>(`/api/drivers?${params.toString()}`)
        .then((data) => setDrivers(data.items))
        .catch(() => setDrivers([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [driverQuery]);

  async function assign(vehicleId: number, driverId: string) {
    try {
      await api(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        body: JSON.stringify({ driverId: driverId === "none" ? null : Number(driverId) }),
      });
      toast.success("Vehicle assignment saved");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not assign the vehicle");
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return vehicles;
    return vehicles.filter((vehicle) =>
      [vehicle.brand, vehicle.model, vehicle.plateNumber, vehicle.type, vehicle.driverName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [vehicles, query]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Vehicles" description="Each vehicle is assigned to one driver." />
      <TableFilter value={query} onChange={setQuery} placeholder="Filter vehicles" />
      {user?.role === "ADMIN" ? (
        <Input value={driverQuery} onChange={(event) => setDriverQuery(event.target.value)} placeholder="Search drivers to assign" />
      ) : null}
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">Nothing matches this filter.</p> : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Plate</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Driver</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
              <TableCell>{vehicle.plateNumber}</TableCell>
              <TableCell>{vehicle.type}</TableCell>
              <TableCell className="w-72">
                {user?.role !== "ADMIN" ? (
                  vehicle.driverName ?? "Unassigned"
                ) : (
                <Select value={vehicle.driverId ? String(vehicle.driverId) : "none"} onValueChange={(value) => assign(vehicle.id, value)}>
                  <SelectTrigger><SelectValue placeholder={vehicle.driverName ?? "Unassigned"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {vehicle.driverId && !drivers.some((driver) => driver.id === vehicle.driverId) ? (
                      <SelectItem value={String(vehicle.driverId)}>{vehicle.driverName ?? "Assigned driver"}</SelectItem>
                    ) : null}
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={String(driver.id)}>{personName(driver.user)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
