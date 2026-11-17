import { Suspense } from "react";
import PersonProfilePage from "@/components/person-profile-page";
import { LoadingBlock } from "@/components/page-state";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <PersonProfilePage />
    </Suspense>
  );
}
