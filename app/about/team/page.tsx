"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

type TeamMember = {
  name: string;
  position: string;
  image: string;
  description: string;
  achievements: string[];
};

/** Leadership / board members — same people as the home Leadership section */
const leadershipMembers: TeamMember[] = [
  {
    name: "Javan Rolynce",
    position: "Founder & Chief Executive Officer",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767009380/Javan_Roylence_a6fnzo.jpg",
    description:
      "Javan Rolynce is the Founder and Chief Executive Officer of Changer Fusions, a dynamic events management and creative consultancy company committed to delivering impactful, innovative, and well-executed experiences across Kenya. With a strong background in events coordination, marketing, and strategic communications, Javan brings a results-driven and people-centered leadership approach to the organization.",
    achievements: [
      "He is known for his ability to conceptualize, plan, and execute high-profile events ranging from fashion showcases and awards ceremonies to corporate, cultural, and community-based engagements.",
      "Under his leadership, Changer Fusions continues to grow as a trusted brand, driven by professionalism, creativity, and attention to detail.",
      "Beyond events management, Javan is passionate about youth empowerment, talent development, and ethical leadership.",
      "His vision for Changer Fusions is to create platforms that elevate talent, foster collaboration, and deliver meaningful value to clients, partners, and communities.",
    ],
  },
  {
    name: "Alex Etidit",
    position: "Technical Director",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768370403/Alex_Etidit-CTO_nkeiwj.jpg",
    description:
      "Alex Etidit serves as the Technical Director at Changer Fusions, overseeing all technical architecture, systems development, and digital innovation initiatives. With a deep understanding of technology infrastructure and emerging digital solutions, Alex ensures that the organization remains technologically agile, secure, and scalable.",
    achievements: [
      "His role is central to driving product development, optimizing technical processes, and aligning technology with the company's long-term strategic goals.",
      "Alex is passionate about using technology to solve real-world challenges and enhance operational efficiency.",
    ],
  },
  {
    name: "Victoria Mapenzi",
    position: "Finance and Operations Director",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1789386858/Victoria_h2bryf.jpg",
    description:
      "Victoria Mapenzi is the Finance and Operations Director at Changer Fusions. She leads finance and operations so delivery stays on time and on budget—from first brief through campaign and event execution across Mombasa, the Coast, Nairobi, Kisumu, and the rest of Kenya.",
    achievements: [],
  },
  {
    name: "Cynthia Moraa Mogaka",
    position: "Finance and Administration Officer",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767190734/Cynthia_Moraa_deohfp.jpg",
    description:
      "Cynthia Moraa Mogaka is the Finance and Administration Officer at Changer Fusions, where she blends analytical precision with a people-centered approach. With a background in government finance and community outreach, she brings a calm and structured approach to the team. Cynthia is dedicated to driving growth through smart execution, ensuring that financial processes support the company's mission of delivering impactful experiences.",
    achievements: [
      "Strategic Financial Management: She focuses on strengthening financial accuracy and improving workflows to support informed, data-driven decision-making.",
      "Operational Excellence: She ensures high standards of financial health by maintaining audit-ready records, performing precise reconciliations, and managing statutory obligations.",
      "Commitment to Integrity: She brings a mature approach to financial compliance and record management, consistently raising the standard for organizational quality.",
      "Stakeholder Engagement: Beyond the numbers, she is passionate about resolving concerns and maintaining a welcoming environment for all clients and partners.",
    ],
  },
];

const BANNER_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

function MemberProfileModal({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="team-profile-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6 sm:pb-6"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22 }}
          className="relative max-h-[min(88dvh,42rem)] w-full overflow-y-auto overscroll-contain bg-white px-4 py-6 text-left shadow-xl sm:max-h-[min(90vh,42rem)] sm:w-[85vw] sm:px-10 sm:py-10 md:px-12"
          style={{ textAlign: "left" }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-gray-500 transition-colors hover:text-gray-800 sm:right-4 sm:top-4"
            aria-label={`Close profile for ${member.name}`}
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <h2
            id={titleId}
            className="pr-12 text-left font-montserrat text-lg font-bold leading-snug text-secondary-800 sm:text-2xl"
            style={{ textAlign: "left" }}
          >
            {member.name}
          </h2>
          <p
            className="mt-1 text-left font-montserrat text-sm font-bold leading-snug text-primary-700 sm:text-lg"
            style={{ textAlign: "left" }}
          >
            {member.position}
          </p>

          <div className="mt-5 space-y-3 text-left text-sm leading-relaxed text-gray-800 sm:mt-6 sm:space-y-4 sm:text-base sm:leading-[1.75]">
            <p>{member.description}</p>
            {member.achievements.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function BoardMemberCard({
  member,
  index,
  onOpen,
}: {
  member: TeamMember;
  index: number;
  onOpen: (member: TeamMember) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="min-w-0 text-left"
    >
      <button
        type="button"
        onClick={() => onOpen(member)}
        className="group flex w-full min-w-0 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-600 focus-visible:ring-offset-2"
        aria-label={`View profile for ${member.name}`}
        style={{ textAlign: "left" }}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100 sm:aspect-[4/5]">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 40vw, 22vw"
          />
        </div>
        <h3
          className="mt-2 w-full break-words text-left font-montserrat text-[0.7rem] font-bold uppercase leading-snug text-secondary-800 transition-colors group-hover:text-secondary-700 sm:mt-3 sm:text-sm md:text-[0.95rem]"
          style={{ textAlign: "left" }}
        >
          {member.name}
        </h3>
        <p
          className="mt-0.5 w-full break-words text-left text-[0.7rem] italic leading-snug text-gray-900 sm:mt-1 sm:text-sm"
          style={{ textAlign: "left" }}
        >
          {member.position}
        </p>
      </button>
    </motion.article>
  );
}

function SectionBanner({ title }: { title: string }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={BANNER_IMAGE}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/75" />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] opacity-40 sm:block"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)`,
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to left, black 10%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 85%)",
          }}
        />
        <svg
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[50%] opacity-30 sm:block"
          viewBox="0 0 400 160"
          fill="none"
          aria-hidden="true"
          preserveAspectRatio="xMaxYMid slice"
        >
          <g stroke="white" strokeWidth="0.8">
            <line x1="40" y1="30" x2="120" y2="55" />
            <line x1="120" y1="55" x2="200" y2="28" />
            <line x1="200" y1="28" x2="280" y2="70" />
            <line x1="120" y1="55" x2="160" y2="110" />
            <line x1="160" y1="110" x2="260" y2="95" />
            <line x1="280" y1="70" x2="340" y2="40" />
            <line x1="280" y1="70" x2="350" y2="120" />
            <line x1="200" y1="28" x2="240" y2="130" />
          </g>
          <g fill="white">
            <circle cx="40" cy="30" r="2.5" />
            <circle cx="120" cy="55" r="2.5" />
            <circle cx="200" cy="28" r="2.5" />
            <circle cx="280" cy="70" r="2.5" />
            <circle cx="160" cy="110" r="2.5" />
            <circle cx="260" cy="95" r="2.5" />
            <circle cx="340" cy="40" r="2.5" />
            <circle cx="350" cy="120" r="2.5" />
            <circle cx="240" cy="130" r="2.5" />
          </g>
        </svg>
      </div>
      <div className="relative mx-auto flex min-h-[3.25rem] w-full max-w-[90rem] items-end px-4 pb-2.5 pt-5 sm:min-h-[5rem] sm:px-6 sm:pb-3.5 sm:pt-6 lg:px-10 xl:px-14 2xl:px-16">
        <h2 className="max-w-[18rem] font-montserrat text-xl font-bold uppercase leading-tight tracking-wide text-white sm:max-w-none sm:text-3xl sm:leading-snug md:text-4xl">
          {title}
        </h2>
      </div>
    </div>
  );
}

export default function OurTeamPage() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://cmfagency.co.ke/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "About Us",
        item: "https://cmfagency.co.ke/about",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Our Team",
        item: "https://cmfagency.co.ke/about/team",
      },
    ],
  };

  const allMembers = leadershipMembers;

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://cmfagency.co.ke/about/team",
    url: "https://cmfagency.co.ke/about/team",
    name: "Our Team - Expert Marketing Professionals in Kenya | Changer Fusions",
    description:
      "Meet the expert marketing team at Changer Fusions - Kenya's leading marketing agency. Our experienced professionals deliver innovative marketing solutions for businesses across Kenya.",
    inLanguage: "en-KE",
    isPartOf: {
      "@type": "WebSite",
      name: "Changer Fusions",
      url: "https://cmfagency.co.ke",
    },
    breadcrumb: {
      "@id": "https://cmfagency.co.ke/about/team#breadcrumb",
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Changer Fusions Team Members",
      description: "Expert marketing professionals and team members at Changer Fusions",
      itemListElement: allMembers.map((member, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Person",
          name: member.name,
          jobTitle: member.position,
          description: member.description,
          image: member.image,
          worksFor: {
            "@type": "Organization",
            name: "Changer Fusions",
            url: "https://cmfagency.co.ke",
          },
        },
      })),
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Changer Fusions",
    url: "https://cmfagency.co.ke",
    logo: BRAND_LOGO_URL,
    description:
      "Kenya's leading marketing agency specializing in digital marketing, website development, branding, event management, and market research.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "AMBALAL BUILDING, NKRUMA ROAD",
      addressLocality: "Mombasa",
      addressRegion: "Mombasa County",
      postalCode: "40305",
      addressCountry: "KE",
    },
    employee: allMembers.map((member) => ({
      "@type": "Person",
      name: member.name,
      jobTitle: member.position,
      description: member.description,
      image: member.image,
    })),
  };

  useEffect(() => {
    const scripts = [
      { id: "breadcrumb-schema", data: breadcrumbSchema },
      { id: "webpage-schema", data: webpageSchema },
      { id: "organization-schema", data: organizationSchema },
    ];

    scripts.forEach(({ id, data }) => {
      const existingScript = document.getElementById(id);
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.text = JSON.stringify(data);
      document.head.appendChild(script);
    });

    return () => {
      scripts.forEach(({ id }) => {
        const script = document.getElementById(id);
        if (script) {
          script.remove();
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f7] pt-[var(--site-nav-height)] pb-[calc(var(--site-mobile-dock-height)+1rem)] md:pb-0">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-[90rem] px-3 py-3 sm:px-6 sm:py-4 lg:px-10 xl:px-14 2xl:px-16">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[0.7rem] text-gray-600 sm:text-sm"
          >
            <Link href="/" className="hover:text-secondary-600">
              CHANGER FUSIONS
            </Link>
            <span aria-hidden="true">›</span>
            <Link href="/about" className="hover:text-secondary-600">
              ABOUT US
            </Link>
            <span aria-hidden="true">›</span>
            <span className="font-semibold text-gray-900">OUR TEAM</span>
          </nav>
        </div>
      </div>

      <h1 className="sr-only">Our Expert Marketing Team in Kenya</h1>

      <section aria-labelledby="leadership-heading">
        <SectionBanner title="Board of Directors" />
        <span id="leadership-heading" className="sr-only">
          Board of Directors
        </span>
        <div className="mx-auto w-full max-w-[90rem] px-3 py-8 sm:px-6 sm:py-12 sm:pb-20 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 text-left sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 md:gap-x-8 lg:gap-x-10">
            {leadershipMembers.map((member, index) => (
              <BoardMemberCard
                key={member.name}
                member={member}
                index={index}
                onOpen={setSelectedMember}
              />
            ))}
          </div>
        </div>
      </section>

      {selectedMember ? (
        <MemberProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      ) : null}
    </div>
  );
}
