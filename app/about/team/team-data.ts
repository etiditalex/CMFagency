export type TeamMember = {
  name: string;
  position: string;
  image: string;
  description: string;
  achievements: string[];
  /** URL-safe id for Person @id / fragment discovery */
  slug: string;
  knowsAbout: string[];
};

export const TEAM_PAGE_URL = "https://cmfagency.co.ke/about/team";

/** Board of Directors — shared by UI, metadata, and structured data */
export const leadershipMembers: TeamMember[] = [
  {
    slug: "javan-rolynce",
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
    knowsAbout: [
      "Events management",
      "Marketing strategy",
      "Strategic communications",
      "Brand leadership",
      "Youth empowerment",
    ],
  },
  {
    slug: "alex-etidit",
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
    knowsAbout: [
      "Technical architecture",
      "Software development",
      "Digital innovation",
      "Fusion Xpress",
      "Platform security",
    ],
  },
  {
    slug: "victoria-mapenzi",
    name: "Victoria Mapenzi",
    position: "Finance and Operations Director",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1789386858/Victoria_h2bryf.jpg",
    description:
      "Victoria Mapenzi is the Finance and Operations Director at Changer Fusions. She leads finance and operations so delivery stays on time and on budget—from first brief through campaign and event execution across Mombasa, the Coast, Nairobi, Kisumu, and the rest of Kenya.",
    achievements: [],
    knowsAbout: [
      "Finance",
      "Operations management",
      "Budgeting",
      "Event operations",
      "Business operations Kenya",
    ],
  },
  {
    slug: "christine-achilah",
    name: "Christine Achilah",
    position: "Events Coordinator",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1790673980/Kimberly_jl3eni.jpg",
    description:
      "Christine Achilah is the Events Coordinator at Changer Fusions, where she helps turn creative briefs into well-run experiences on the ground. She supports planning, guest flow, vendor coordination, and day-of execution so fashion showcases, awards, corporate programmes, and community events run smoothly from setup to close.",
    achievements: [
      "She works closely with operations and leadership to keep timelines, run-of-show details, and on-site teams aligned.",
      "Christine brings a calm, people-first approach to coordinating guests, partners, and crew—ensuring every touchpoint reflects the Changer Fusions standard of professionalism and impact.",
    ],
    knowsAbout: [
      "Events coordination",
      "Vendor management",
      "Guest experience",
      "On-site event execution",
      "Run of show",
    ],
  },
];

export function memberFullBio(member: TeamMember): string {
  const extras = member.achievements.join(" ");
  return extras ? `${member.description} ${extras}` : member.description;
}
