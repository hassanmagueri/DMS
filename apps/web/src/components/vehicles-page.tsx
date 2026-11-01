"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { Button } from "@/components/ui/button";
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
import type { Driver } from "@/types/domain";

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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api<Vehicle[]>("/api/vehicles"), api<Driver[]>("/api/drivers")])
      .then(([vehicleRows, driverRows]) => {
        setVehicles(vehicleRows);
        setDrivers(driverRows);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

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

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Vehicles</h2>
        <p className="text-sm text-muted-foreground">One vehicle can be assigned to one driver. Administrators can change the assignment.</p>
      </div>
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
          {vehicles.map((vehicle) => (
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
    </div>
  );
}
