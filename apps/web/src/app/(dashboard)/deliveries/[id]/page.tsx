import { Suspense } from "react";
import DeliveryDetailPage from "@/components/delivery-detail-page";
import { LoadingBlock } from "@/components/page-state";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <DeliveryDetailPage />
    </Suspense>
  );
}
