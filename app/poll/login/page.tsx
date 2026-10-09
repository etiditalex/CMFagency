import type { Metadata } from "next";
import PollAccountAuth from "@/components/poll/PollAccountAuth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to a Changer Fusions poll account and open Poll in Fusion Xpress.",
};

export default function PollLoginPage() {
  return <PollAccountAuth mode="login" />;
}
