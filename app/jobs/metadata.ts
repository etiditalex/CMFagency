import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Used for Open Graph / Twitter when `/jobs` (or job search) links are shared. */
export const JOBS_BOARD_OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1774271030/job-search-magnifier-glass-symbol_1_nzfudf.jpg";

const title =
  "Jobs in Kenya & Remote | Hire & Find Work | Changer Fusions Job Board";
const description =
  "Browse jobs in Kenya, remote Africa roles, and global listings in one place. Employers post vacancies; job seekers search tech, marketing, events, and creative roles. Changer Fusions (CMF Agency) job board—Nairobi, Mombasa, and work-from-home opportunities updated regularly.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Changer Fusions",
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  category: "jobs",
  keywords: [
    "jobs Kenya",
    "Kenya job board",
    "remote jobs Africa",
    "work from home Kenya",
    "Nairobi jobs",
    "Mombasa jobs",
    "tech jobs Kenya",
    "marketing jobs Kenya",
    "creative jobs Kenya",
    "events jobs Kenya",
    "internships Kenya",
    "graduate jobs Kenya",
    "employer hiring Kenya",
    "post a job Kenya",
    "Changer Fusions careers",
    "CMF Agency jobs",
    "cmfagency jobs",
    "find jobs online Kenya",
    "software developer jobs Kenya",
    "digital marketing careers Kenya",
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
    url: `${SITE_URL}/jobs`,
    siteName: "Changer Fusions",
    title,
    description,
    images: [
      {
        url: JOBS_BOARD_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Job search — Changer Fusions job board (Kenya & remote)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [JOBS_BOARD_OG_IMAGE],
  },
  alternates: {
    canonical: `${SITE_URL}/jobs`,
  },
};
