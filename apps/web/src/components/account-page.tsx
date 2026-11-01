"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { personName } from "@/lib/format";

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{personName(user)}</h2>
        <p className="text-sm text-muted-foreground">Signed in with a JWT stored for this browser session.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Username: {user.username}</p>
          <p>Email: {user.email}</p>
          <p>Phone: {user.phone}</p>
          <p>Role: {user.role}</p>
          <p>Status: {user.status}</p>
        </CardContent>
      </Card>
    </div>
  );
}
