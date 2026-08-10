import { Metadata } from "next";

const OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg";

export const metadata: Metadata = {
  title: "Careers at Changer Fusions | Attachments, Internships & Jobs in Kenya",
  description:
    "Explore career development with Changer Fusions in Kenya. Find attachments, internships, and jobs in marketing, fashion, events, and education — plus guidance to grow your professional path.",
  keywords: [
    "careers Changer Fusions",
    "career development Kenya",
    "attachments Kenya",
    "internships Kenya",
    "jobs Mombasa",
    "marketing internship Kenya",
    "fashion internship Kenya",
    "events jobs Kenya",
    "career coaching Kenya",
    "student attachment opportunities",
    "graduate jobs Kenya",
    "Changer Fusions careers",
    "CMF Agency careers",
    "career development profession",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "Changer Fusions",
    title: "Careers at Changer Fusions | Attachments, Internships & Jobs",
    description:
      "Build your career with Changer Fusions — attachments, internships, and jobs across marketing, fashion, events, and education in Kenya.",
    url: "https://cmfagency.co.ke/careers",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Careers at Changer Fusions — career development and opportunities in Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers at Changer Fusions | Attachments, Internships & Jobs",
    description:
      "Explore career development, attachments, internships, and jobs with Changer Fusions in Kenya.",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/careers",
  },
  category: "careers",
};
