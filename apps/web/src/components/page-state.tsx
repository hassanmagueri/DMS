import { Button } from "@/components/ui/button";

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
