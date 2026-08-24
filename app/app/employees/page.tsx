import { Suspense } from "react";

import AppEmployeesScreen from "@/components/android-shell/employees/AppEmployeesScreen";

export default function AppEmployeesPage() {
  return (
    <Suspense>
      <AppEmployeesScreen />
    </Suspense>
  );
}
