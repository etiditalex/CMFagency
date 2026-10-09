import { redirect } from "next/navigation";
import { POLL_LIVE_DEMO_PUBLIC_PATH } from "@/lib/poll/poll-dashboard-paths";

export default function DashboardPollLiveDemoPage() {
  redirect(POLL_LIVE_DEMO_PUBLIC_PATH);
}
