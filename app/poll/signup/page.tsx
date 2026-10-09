import type { Metadata } from "next";
import PollAccountAuth from "@/components/poll/PollAccountAuth";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Changer Fusions account. The dashboard opens with Poll only.",
};

export default function PollSignupPage() {
  return <PollAccountAuth mode="signup" />;
}
