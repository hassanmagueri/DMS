import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";

const styles: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ASSIGNED: "border-blue-200 bg-blue-50 text-blue-800",
  ACCEPTED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  REJECTED: "border-orange-200 bg-orange-50 text-orange-800",
  PICKED_UP: "border-violet-200 bg-violet-50 text-violet-800",
  IN_TRANSIT: "border-sky-200 bg-sky-50 text-sky-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-700",
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ON_DELIVERY: "border-sky-200 bg-sky-50 text-sky-800",
  OFFLINE: "border-zinc-200 bg-zinc-100 text-zinc-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {statusLabel(status)}
    </Badge>
  );
}
