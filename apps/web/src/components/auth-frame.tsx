import type { ReactNode } from "react";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_32rem]">
      <section className="hidden flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex">
        <img src="/brand-logo.png" alt="Delivery Project Management" className="h-14 w-auto max-w-xs rounded-md bg-white object-contain px-2" />
        <div className="max-w-md space-y-3">
          <p className="text-3xl font-semibold tracking-tight">Move every parcel with a clear status.</p>
          <p className="text-sm leading-6 text-sidebar-foreground/75">
            Assign drivers, follow handovers, and record pay-on-delivery from one desk.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Delivery Management System</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10">{children}</section>
    </div>
  );
}
