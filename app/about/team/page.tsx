"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

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
  {
    name: "Violet Moriasi",
    position: "Marketing Director",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768399105/Violet_Kwamboka-_Director_Marketing_w5n2ac.jpg",
    description: "Violet Moriasi is the Marketing Director at Changer Fusions, responsible for shaping the company's brand identity, marketing strategy, and market positioning. She brings extensive experience in digital marketing, brand communication, and audience engagement across multiple platforms.",
    achievements: [
      "Violet is known for her creative insight and data-driven approach to marketing, ensuring that campaigns are impactful, consistent, and aligned with business objectives.",
      "Her leadership continues to strengthen Changer Fusions' visibility, brand credibility, and customer engagement.",
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
  {
    name: "Maxwell Wisdom",
    position: "Legal & Contracts Manager",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768399036/Maxwell_Wisdom-_Legal_and_Contracts_xyfhy6.jpg",
    description: "Maxwell Wisdom serves as the Legal & Contracts Manager at Changer Fusions, where he supports business operations through effective contract management and risk control. He is responsible for drafting and negotiating client, vendor, and partnership agreements, identifying legal risks within projects, and proposing practical mitigation measures.",
    achievements: [
      "Maxwell works closely with other departments and marketing teams, ensuring all digital, creative, and consulting services are governed by clear, enforceable legal terms that protect the organization's interests.",
    ],
  },
  {
    name: "Mohamed Ibrahim",
    position: "Social Media Manager",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768398936/Mohamed_Ibrahim-Social_Media_Manager_sckrd2.jpg",
    description: "Mohamed Ibrahim is a dedicated Social Media Manager at Changer Fusions, with a strong foundation in digital communication and content management. He is a hardworking, self-motivated professional with solid computer and digital competencies, capable of managing multiple responsibilities with accuracy and professionalism.",
    achievements: [
      "Mohamed plays an active role in overseeing and optimizing the company's social media platforms, ensuring consistent brand messaging, audience engagement, and digital visibility.",
      "He is committed to continuous learning, personal development, and making meaningful contributions toward the organization's growth and strategic objectives.",
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
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100"
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
        <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
        <p className="text-secondary-600 font-semibold mb-4">{member.position}</p>
        
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <p className="text-gray-700 text-sm leading-relaxed">{member.description}</p>
            <div className="space-y-2 pt-2 border-t border-gray-200">
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
              className="text-secondary-600 hover:text-secondary-700 font-semibold text-sm flex items-center space-x-1 mt-4"
            >
              <span>View less</span>
              <ChevronRight className="w-4 h-4 rotate-90" />
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="bg-secondary-600 hover:bg-secondary-700 text-white font-semibold py-2.5 px-6 rounded-md transition-colors duration-300 text-sm w-full"
          >
            View more
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function OurTeamPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-secondary-600">CHANGER FUSIONS</Link>
            {" > "}
            <Link href="/about" className="hover:text-secondary-600">ABOUT US</Link>
            {" > "}
            <span className="text-gray-900 font-semibold">OUR TEAM</span>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
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
                  To make marketing the force behind business in Kenya and beyond.
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">OUR MISSION</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  To deliver innovative, impactful marketing solutions that drive business growth and create lasting value for our clients and communities.
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
            {/* Executive Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-secondary-600 mb-8">EXECUTIVE</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {executiveMembers.map((member, index) => (
                  <MemberCard key={member.name} member={member} index={index} />
                ))}
              </div>
            </section>

            {/* Team Section */}
            {teamMembers.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-secondary-600 mb-8">TEAM</h2>
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
