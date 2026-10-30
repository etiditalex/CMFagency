import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import FormsGrid from "@/components/forms/FormsGrid";
import { BUILT_IN_FORM_CARDS, getPublishedForms } from "@/lib/forms-server";

const title = "Forms | Changer Fusions";
const description =
  "Open applications, registrations, and other forms from Changer Fusions. New forms published in Fusion Xpress appear here.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/forms` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/forms`,
    type: "website",
    locale: "en_KE",
    siteName: "Changer Fusions",
  },
};

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const forms = [...BUILT_IN_FORM_CARDS, ...(await getPublishedForms())];
  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent pt-28 md:pt-32">
      <div className="mb-5 w-full px-2 sm:mb-6 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Forms</h1>
      </div>
      <FormsGrid forms={forms} />
    </div>
  );
}
