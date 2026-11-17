"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { ErrorBlock, LoadingBlock } from "@/components/page-state";
import { api } from "@/lib/api";
import type { PersonProfile } from "@/types/profile";

export default function PersonProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PersonProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<PersonProfile>(`/api/profiles/${params.id}`)
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) return <LoadingBlock label="Loading profile..." />;
  if (error || !profile) return <ErrorBlock message={error ?? "Profile not found"} onRetry={load} />;
  return <ProfileView profile={profile} onChange={load} />;
}
