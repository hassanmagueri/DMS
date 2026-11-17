"use client";

function Portrait({ role }: { role: string }) {
  if (role === "DRIVER") {
    return (
      <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
        <rect width="80" height="80" fill="#0f3d4c" />
        <circle cx="40" cy="30" r="12" fill="#f4d7b5" />
        <path d="M22 28c2-10 10-16 18-16s16 6 18 16v4H22v-4z" fill="#1f2937" />
        <path d="M18 70c4-14 14-20 22-20s18 6 22 20" fill="#0e7490" />
        <rect x="48" y="46" width="18" height="10" rx="2" fill="#f8fafc" />
        <circle cx="52" cy="58" r="3" fill="#111827" />
        <circle cx="64" cy="58" r="3" fill="#111827" />
      </svg>
    );
  }
  if (role === "DISPATCHER") {
    return (
      <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
        <rect width="80" height="80" fill="#1e293b" />
        <circle cx="40" cy="32" r="12" fill="#f1c7a4" />
        <path d="M24 26c3-12 28-12 32 0" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <rect x="18" y="28" width="8" height="12" rx="3" fill="#94a3b8" />
        <rect x="54" y="28" width="8" height="12" rx="3" fill="#94a3b8" />
        <path d="M20 72c4-16 14-22 20-22s16 6 20 22" fill="#334155" />
      </svg>
    );
  }
  if (role === "ADMIN") {
    return (
      <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
        <rect width="80" height="80" fill="#111827" />
        <circle cx="40" cy="30" r="12" fill="#e7c2a0" />
        <path d="M22 70c4-14 13-20 18-20s14 6 18 20" fill="#1f2937" />
        <path d="M40 42l10 4v7c0 6-4 10-10 12-6-2-10-6-10-12v-7l10-4z" fill="#f8fafc" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
      <rect width="80" height="80" fill="#1d4ed8" />
      <circle cx="40" cy="30" r="12" fill="#f6d2b3" />
      <path d="M20 72c4-16 14-22 20-22s16 6 20 22" fill="#1e3a8a" />
      <rect x="46" y="48" width="16" height="12" rx="2" fill="#f8fafc" />
      <path d="M48 54h12" stroke="#1d4ed8" strokeWidth="1.5" />
    </svg>
  );
}

export function ProfileAvatar({
  role,
  name,
  src,
  className = "size-16",
}: {
  role: string;
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-full bg-muted`}>
      {src ? (
        // The photo is a data URL chosen by the account owner.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Portrait role={role} />
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
