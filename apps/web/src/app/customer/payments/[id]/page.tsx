import { Suspense } from "react";
import PaymentDetailPage from "@/components/payment-detail-page";
import { LoadingBlock } from "@/components/page-state";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <PaymentDetailPage />
    </Suspense>
  );
}
