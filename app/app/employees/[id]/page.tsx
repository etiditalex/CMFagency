import { Suspense } from "react";

import AppEmployeeDetailScreen from "@/components/android-shell/employees/AppEmployeeDetailScreen";

export default function AppEmployeeDetailPage() {
  return (
    <Suspense>
      <AppEmployeeDetailScreen />
    </Suspense>
  );
}
