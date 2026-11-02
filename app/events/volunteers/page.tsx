import type { Metadata } from "next";
import VolunteerApplication from "@/components/events/VolunteerApplication";
import { getStarterFormContent } from "@/lib/forms-server";
import { starterDefaultContent } from "@/lib/fusion-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Volunteers",
  description:
    "Apply to volunteer as a Regional or County Representative for the Kenya Fashion and Creative Arts Awards (KFCAA), organised by Changer Fusions.",
};

export default async function VolunteersPage() {
  const stored = await getStarterFormContent("volunteers");
  const content = stored ?? starterDefaultContent("volunteers");
  return <VolunteerApplication content={content} />;
}
