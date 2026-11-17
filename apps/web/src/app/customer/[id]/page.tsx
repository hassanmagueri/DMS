import { Suspense } from "react";
import CustomerDeliveryPage from "@/components/customer-delivery-page";
import { LoadingBlock } from "@/components/page-state";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CustomerDeliveryPage />
    </Suspense>
  );
}
