"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, Truck } from "lucide-react";
import { ProfileAvatar } from "@/components/role-avatar";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { api, ApiError } from "@/lib/api";
import { formatWhen, personName } from "@/lib/format";
import type { PersonProfile } from "@/types/profile";

function resizePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the photo"));
        return;
      }
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the photo"));
    };
    image.src = url;
  });
}

function deliveryHref(role: string, id: number) {
  if (role === "CUSTOMER") return `/customer/${id}`;
  if (role === "DRIVER") return null;
  return `/deliveries/${id}`;
}

export function ProfileView({ profile, onChange }: { profile: PersonProfile; onChange?: () => void }) {
  const { user, refresh } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const name = personName(profile);
  const viewerRole = user?.role ?? "";
  const own = user?.id === profile.id;
  const canBlock =
    !own &&
    (viewerRole === "ADMIN" ||
      (viewerRole === "DISPATCHER" && (profile.role === "CUSTOMER" || profile.role === "DRIVER")));
  const canRemove = !own && (viewerRole === "ADMIN" || (viewerRole === "DISPATCHER" && profile.role === "DRIVER" && Boolean(profile.driver)));

  async function savePhoto(file: File | null) {
    setBusy(true);
    try {
      const avatar = file ? await resizePhoto(file) : null;
      await api("/api/profiles/me", { method: "PATCH", body: JSON.stringify({ avatar }) });
      toast.success(file ? "Profile photo updated" : "Profile photo removed");
      await refresh();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the photo");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccess() {
    const blocking = profile.enabled;
    const accepted = await confirm({
      title: blocking ? `Block ${name}?` : `Unblock ${name}?`,
      body: blocking
        ? "They will be signed out and cannot sign in until the account is unblocked."
        : "They will be able to sign in again.",
      confirmLabel: blocking ? "Block account" : "Unblock account",
    });
    if (!accepted) return;
    setBusy(true);
    try {
      if (viewerRole === "DISPATCHER" && profile.role === "DRIVER" && profile.driver) {
        await api(`/api/drivers/${profile.driver.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: !profile.enabled }),
        });
      } else if (viewerRole === "DISPATCHER" && profile.role === "CUSTOMER") {
        await api(`/api/customers/${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: !profile.enabled }),
        });
      } else {
        await api(`/api/users/${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: !profile.enabled }),
        });
      }
      toast.success(blocking ? "Account blocked" : "Account unblocked");
      onChange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the account");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    const accepted = await confirm({
      title: `Remove ${name}?`,
      body: "This deletes the account. A driver can be removed after every delivery is finished. A customer who still has deliveries cannot be removed.",
      confirmLabel: "Remove account",
    });
    if (!accepted) return;
    setBusy(true);
    try {
      if (viewerRole === "DISPATCHER" && profile.driver) {
        await api(`/api/drivers/${profile.driver.id}`, { method: "DELETE" });
      } else {
        await api(`/api/users/${profile.id}`, { method: "DELETE" });
      }
      toast.success("Account removed");
      router.push(profile.role === "CUSTOMER" ? "/customers" : profile.role === "DRIVER" ? "/drivers" : "/users");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the account");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar role={profile.role} name={name} src={profile.avatar} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={profile.role} />
              <StatusBadge status={profile.enabled ? "ACTIVE" : "BLOCKED"} />
            </div>
            {own ? (
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      if (file) void savePhoto(file);
                    }}
                  />
                  <span className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm">
                    Choose photo
                  </span>
                </label>
                {profile.avatar ? (
                  <Button type="button" variant="outline" disabled={busy} onClick={() => savePhoto(null)}>
                    Use role image
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {canBlock || canRemove ? (
            <div className="flex gap-2">
              {canBlock ? (
                <Button variant="outline" disabled={busy} onClick={toggleAccess}>
                  {profile.enabled ? "Block" : "Unblock"}
                </Button>
              ) : null}
              {canRemove ? (
                <Button variant="destructive" disabled={busy} onClick={removeAccount}>
                  Remove
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <a className="text-primary" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <a className="text-primary" href={`tel:${profile.phone}`}>
                {profile.phone}
              </a>
            </p>
          </CardContent>
        </Card>

        {profile.driver ? (
          <Card>
            <CardHeader>
              <CardTitle>Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                <StatusBadge status={profile.driver.status} />
              </p>
              <p>License {profile.driver.licenseNumber}</p>
              <p>
                {profile.driver.activeDeliveries} active · {profile.driver.completedDeliveries} delivered
              </p>
              <p className="text-muted-foreground">
                {profile.driver.vehicle
                  ? `${profile.driver.vehicle.brand} ${profile.driver.vehicle.model} · ${profile.driver.vehicle.plateNumber}`
                  : "No vehicle assigned"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{profile.deliveryCount}</p>
              <p className="text-sm text-muted-foreground">On record</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{profile.role === "DRIVER" ? "Assignments" : "Recent deliveries"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries to show.</p>
          ) : (
            profile.deliveries.map((delivery) => {
              const href = deliveryHref(viewerRole, delivery.id);
              const body = (
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">#{delivery.id}</p>
                    <p className="text-muted-foreground">
                      {delivery.pickupCity} → {delivery.dropoffCity} · {formatWhen(delivery.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>
              );
              return href ? (
                <Link key={delivery.id} href={href} className="block hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                <div key={delivery.id}>{body}</div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
