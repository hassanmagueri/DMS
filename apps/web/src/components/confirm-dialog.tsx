"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";

type Ask = (input: { title: string; body: string; confirmLabel?: string }) => Promise<boolean>;

type Request = {
  title: string;
  body: string;
  confirmLabel: string;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<Ask>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  function ask(input: { title: string; body: string; confirmLabel?: string }) {
    return new Promise<boolean>((resolve) => {
      setRequest({
        title: input.title,
        body: input.body,
        confirmLabel: input.confirmLabel ?? "Confirm",
        resolve,
      });
    });
  }

  function close(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {request ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-xl border bg-card p-5 shadow-xl"
          >
            <h3 id="confirm-title" className="text-base font-semibold">
              {request.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => close(true)}>
                {request.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
