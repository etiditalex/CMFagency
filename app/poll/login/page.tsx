import type { Metadata } from "next";
import PollAccountAuth from "@/components/poll/PollAccountAuth";

import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const metadata: Metadata = pollPageMetadata({
  title: "Log in",
  description: "Log in to a Changer Fusions poll account and open Poll in Fusion Xpress.",
  path: "/poll/login",
  keywords: ["Changer Fusions poll login"],
  index: false,
});

export default function PollLoginPage() {
  return <PollAccountAuth mode="login" />;
}
