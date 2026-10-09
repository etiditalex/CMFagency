export const POLL_ACCOUNT_HOME = "/dashboard/polling-fx/poll";
export const POLL_LIVE_DEMO_PATH = "/dashboard/polling-fx/live-demo";
export const POLL_LIVE_DEMO_PUBLIC_PATH = "/poll/live-demo";

export function isPollAccountDashboardPath(pathname: string) {
  return pathname === POLL_ACCOUNT_HOME || pathname === POLL_LIVE_DEMO_PATH || pathname.startsWith(`${POLL_LIVE_DEMO_PATH}/`);
}
