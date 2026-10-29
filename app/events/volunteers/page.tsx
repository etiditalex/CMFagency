import type { Metadata } from "next";
import VolunteerApplication from "@/components/events/VolunteerApplication";

export const metadata: Metadata = {
  title: "Volunteers",
  description:
    "Apply to volunteer as a Regional or County Representative for the Kenya Fashion and Creative Arts Awards (KFCAA), organised by Changer Fusions.",
};

export default function VolunteersPage() {
  return <VolunteerApplication />;
}
