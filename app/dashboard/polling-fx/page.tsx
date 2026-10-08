import type { Metadata } from "next";
import PollingFxDashboard from "@/components/dashboard/PollingFxDashboard";

export const metadata: Metadata = {
  title: "Polling Fx",
};

export default function PollingFxPage() {
  return <PollingFxDashboard />;
}
