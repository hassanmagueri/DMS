"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="edit-dialog-title" className="text-base font-semibold">
            {title}
          </h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
