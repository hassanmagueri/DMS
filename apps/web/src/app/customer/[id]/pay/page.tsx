import { Suspense } from "react";
import CustomerPayPage from "@/components/customer-pay-page";
import { LoadingBlock } from "@/components/page-state";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CustomerPayPage />
    </Suspense>
  );
}
