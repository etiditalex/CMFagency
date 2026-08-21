"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

const executiveMembers = [
  {
    name: "Javan Rolynce",
    position: "Chief Executive Officer (CEO)",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767009380/Javan_Roylence_a6fnzo.jpg",
    description: "Javan Rolynce is the Founder and Chief Executive Officer of Changer Fusions, a dynamic events management and creative consultancy company committed to delivering impactful, innovative, and well-executed experiences across Kenya. With a strong background in events coordination, marketing, and strategic communications, Javan brings a results-driven and people-centered leadership approach to the organization.",
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
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768370403/Alex_Etidit-CTO_nkeiwj.jpg",
    description: "Alex Etidit serves as the Technical Director at Changer Fusions, overseeing all technical architecture, systems development, and digital innovation initiatives. With a deep understanding of technology infrastructure and emerging digital solutions, Alex ensures that the organization remains technologically agile, secure, and scalable.",
    achievements: [
      "His role is central to driving product development, optimizing technical processes, and aligning technology with the company's long-term strategic goals.",
      "Alex is passionate about using technology to solve real-world challenges and enhance operational efficiency.",
    ],
  },
];

const teamMembers = [
  {
    name: "Glen Washington",
    position: "Operations and Events Manager",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767190492/Glen_Washington_ua98z4.jpg",
    description: "Glen Washington is the Operations and Events Manager at Changer Fusions, where he plays a central role in turning creative concepts into seamless, high-impact experiences. With a strong foundation in events coordination, logistics management, and team leadership, Glen ensures that every project is executed efficiently, professionally, and to the highest standard.",
    achievements: [
      "With hands-on experience in planning, scheduling, vendor coordination, and on-ground execution, Glen oversees the operational backbone of Changer Fusions' events.",
      "His ability to manage multiple moving parts while maintaining attention to detail allows the company to consistently deliver well-organized and memorable events across diverse formats.",
    ],
  },
  {
    name: "Cynthia Moraa Mogaka",
    position: "Finance and Administration Officer",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767190734/Cynthia_Moraa_deohfp.jpg",
    description: "Cynthia Moraa Mogaka is the Finance and Administration Officer at Changer Fusions, where she blends analytical precision with a people-centered approach. With a background in government finance and community outreach, she brings a calm and structured approach to the team. Cynthia is dedicated to driving growth through smart execution, ensuring that financial processes support the company's mission of delivering impactful experiences.",
    achievements: [
      "Strategic Financial Management: She focuses on strengthening financial accuracy and improving workflows to support informed, data-driven decision-making.",
      "Operational Excellence: She ensures high standards of financial health by maintaining audit-ready records, performing precise reconciliations, and managing statutory obligations.",
      "Commitment to Integrity: She brings a mature approach to financial compliance and record management, consistently raising the standard for organizational quality.",
      "Stakeholder Engagement: Beyond the numbers, she is passionate about resolving concerns and maintaining a welcoming environment for all clients and partners.",
    ],
  },
  {
    name: "Byron Kodhiambo",
    position: "Marketing and Communications Manager",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767192241/mypi_jc8no0.jpg",
    description: "Byron Kodhiambo is the Marketing and Communications Manager at Changer Fusions, where he leads brand strategy, communications, and sales-driven marketing initiatives. He has played a key role in driving creative sales ideas, strategic partnerships, and audience engagement campaigns that support business growth and brand visibility.",
    achievements: [
      "With a people-centered and results-oriented approach, Byron helps position Changer Fusions as a trusted, innovative force in Kenya's events and creative industry.",
      "He champions talent development, collaboration, and ethical leadership within the organization.",
    ],
  },
];

interface MemberCardProps {
  member: typeof executiveMembers[0];
  index: number;
}

function MemberCard({ member, index }: MemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="bg-white overflow-hidden border border-[#e5e5e5]"
    >
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover object-top"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-[#1a2332] mb-2">{member.name}</h3>
        <p className="text-[#555] font-normal mb-4">{member.position}</p>
        
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <p className="text-gray-700 text-sm leading-relaxed">{member.description}</p>
            <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
              {member.achievements.map((achievement, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{achievement}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#555] hover:text-[#1a2332] text-sm underline underline-offset-2 mt-4"
            >
              View less
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-[#555] hover:text-[#1a2332] text-sm underline underline-offset-2"
          >
            View more
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function OurTeamPage() {
  // Structured Data for SEO
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

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://cmfagency.co.ke/about/team",
    url: "https://cmfagency.co.ke/about/team",
    name: "Our Team - Expert Marketing Professionals in Kenya | Changer Fusions",
    description: "Meet the expert marketing team at Changer Fusions - Kenya's leading marketing agency. Our experienced professionals deliver innovative marketing solutions for businesses across Kenya.",
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
      itemListElement: [
        ...executiveMembers.map((member, index) => ({
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
        ...teamMembers.map((member, index) => ({
          "@type": "ListItem",
          position: executiveMembers.length + index + 1,
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
      ],
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Changer Fusions",
    url: "https://cmfagency.co.ke",
    logo: BRAND_LOGO_URL,
    description: "Kenya's leading marketing agency specializing in digital marketing, website development, branding, event management, and market research.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "AMBALAL BUILDING, NKRUMA ROAD",
      addressLocality: "Mombasa",
      addressRegion: "Mombasa County",
      postalCode: "40305",
      addressCountry: "KE",
    },
    employee: [
      ...executiveMembers.map((member) => ({
        "@type": "Person",
        name: member.name,
        jobTitle: member.position,
        description: member.description,
        image: member.image,
      })),
      ...teamMembers.map((member) => ({
        "@type": "Person",
        name: member.name,
        jobTitle: member.position,
        description: member.description,
        image: member.image,
      })),
    ],
  };

  useEffect(() => {
    // Add structured data scripts
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
    <div className="pt-28 md:pt-32 min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-secondary-600">CHANGER FUSIONS</Link>
            {" > "}
            <Link href="/about" className="hover:text-secondary-600">ABOUT US</Link>
            {" > "}
            <span className="text-gray-900 font-semibold">OUR TEAM</span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Navigation */}
          <aside className="lg:col-span-1">
            <div className="bg-white border-2 border-secondary-600 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">ABOUT</h2>
              <nav className="space-y-2">
                <Link
                  href="/about"
                  className="block text-gray-700 hover:text-secondary-600 transition-colors duration-200"
                >
                  ABOUT US
                </Link>
                <Link
                  href="/about/team"
                  className="block text-secondary-600 font-semibold flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>OUR TEAM</span>
                </Link>
                <Link
                  href="/about/partners"
                  className="block text-gray-700 hover:text-secondary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>PARTNERS</span>
                </Link>
              </nav>

              {/* Vision, Mission, and Core Values Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">OUR VISION</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  To be the driving force behind businesses' success in a dynamic and ever-evolving market landscape.
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">OUR MISSION</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  To harness marketing as the catalyst for change and innovation, empowering businesses to thrive and define their existence in the marketplace.
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">CORE VALUES</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      <strong className="text-gray-900">Innovation:</strong> We embrace creativity, emerging trends, and modern technologies.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      <strong className="text-gray-900">Integrity:</strong> We operate with honesty, transparency, and accountability.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      <strong className="text-gray-900">Excellence:</strong> We are committed to the highest standards of quality and professionalism.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      <strong className="text-gray-900">Client-Centricity:</strong> Our clients' goals are at the center of everything we do.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      <strong className="text-gray-900">Impact & Results:</strong> We focus on outcomes and measurable impact for our clients.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Page Title - H1 for SEO */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Our Expert Marketing Team in Kenya</h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Meet the passionate professionals driving innovation and excellence at Changer Fusions. Our experienced team delivers exceptional marketing solutions for businesses across Kenya.
              </p>
            </div>
            
            {/* Executive Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-secondary-600 pb-3 mb-8 border-b border-[#e5e5e5]">EXECUTIVE</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {executiveMembers.map((member, index) => (
                  <MemberCard key={member.name} member={member} index={index} />
                ))}
              </div>
            </section>

            {/* Team Section */}
            {teamMembers.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-secondary-600 pb-3 mb-8 border-b border-[#e5e5e5]">TEAM</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teamMembers.map((member, index) => (
                    <MemberCard key={member.name} member={member} index={index} />
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
