import type { Metadata } from "next";
import PollAccountAuth from "@/components/poll/PollAccountAuth";

import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const metadata: Metadata = pollPageMetadata({
  title: "Create an account",
  description: "Create a free Changer Fusions poll account. The dashboard opens with Poll only.",
  path: "/poll/signup",
  keywords: ["Changer Fusions poll account"],
  index: false,
});

export default function PollSignupPage() {
  return <PollAccountAuth mode="signup" />;
}
