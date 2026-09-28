import type { Metadata } from "next";
import KenyaCoastModelsRegistration from "@/components/kcm/KenyaCoastModelsRegistration";

export const metadata: Metadata = {
  title: "Kenya Coast Models",
  description:
    "Register for the Sustainable Fashion & Models Empowerment Forum on Saturday, 28 November 2026 at IoME001, Mombasa. Members KES 200, non-members KES 300. Limited to 100 guests.",
};

export default function KenyaCoastModelsPage() {
  return <KenyaCoastModelsRegistration />;
}
