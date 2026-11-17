"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/profile-view";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { api } from "@/lib/api";
import type { PersonProfile } from "@/types/profile";

export default function AccountPage() {
  const [profile, setProfile] = useState<PersonProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<PersonProfile>("/api/profiles/me")
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock label="Loading your profile..." />;
  if (error || !profile) return <ErrorBlock message={error ?? "Could not load your profile"} onRetry={load} />;
  return <ProfileView profile={profile} />;
}
