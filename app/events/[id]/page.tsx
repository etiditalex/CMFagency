"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users, ArrowLeft, CheckCircle, Send, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import Image from "next/image";

// All events data - matching the events page
const featuredEvent = {
  id: 1,
  title: "Mr and Ms Deaf Kenya",
  subtitle: "Beauty Pageant",
  date: new Date(2024, 8, 15),
  endDate: new Date(2024, 8, 15),
  galaDate: new Date(2024, 8, 15),
  location: "Mombasa, Kenya",
  fullLocation: "Mombasa, Coast Region",
  time: "6:00 PM - 11:00 PM",
  image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
  description: "A prestigious beauty pageant celebrating the beauty, talent, and achievements of the deaf community in Kenya. This inclusive event showcases the remarkable abilities and contributions of deaf individuals, promoting awareness, inclusion, and empowerment. The pageant features contestants from across Kenya competing for the titles of Mr and Ms Deaf Kenya, highlighting their talents, advocacy work, and positive impact on society.",
  fullDescription: "Mr and Ms Deaf Kenya is a prestigious and inclusive beauty pageant that celebrates the beauty, talent, and remarkable achievements of the deaf community in Kenya. This groundbreaking event goes beyond traditional pageantry to showcase the incredible abilities, resilience, and contributions of deaf individuals across the nation. The pageant features contestants from various regions of Kenya who compete for the prestigious titles of Mr and Ms Deaf Kenya, demonstrating their talents, advocacy work, cultural heritage, and positive impact on society. The event includes multiple competition segments including talent showcases, cultural presentations, evening wear competitions, and question-and-answer sessions that highlight contestants' intelligence, confidence, and commitment to advocacy. Beyond the competition, this pageant serves as a powerful platform for promoting awareness about deaf culture, breaking down barriers, challenging stereotypes, and advocating for inclusion and accessibility. The event brings together the deaf community, their families, supporters, and allies to celebrate diversity and empowerment. Winners of the pageant become ambassadors for the deaf community, using their platform to advocate for rights, accessibility, and inclusion. This event is not just about beauty and talent, but about celebrating the strength, resilience, and achievements of the deaf community while inspiring others and creating positive change in society.",
  status: "past",
  category: "Fashion & Modelling",
  registrationOpen: false,
  tickets: [
    { type: "Early Bird", price: 1000, currency: "KSh" },
    { type: "Gate", price: 3000, currency: "KSh" },
    { type: "Advance", price: 2000, currency: "KSh" },
    { type: "VIP", price: 5000, currency: "KSh" },
    { type: "VVIP", price: 7500, currency: "KSh" },
  ],
};

const allEvents = [
  featuredEvent,
  {
    id: 2,
    title: "The Coast Fashion and Modeling Awards",
    date: new Date(2024, 8, 15),
    location: "Mombasa, Coast Region",
    time: "6:00 PM - 11:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "Celebrating excellence in fashion and modeling along the Kenyan coast. A prestigious awards ceremony recognizing top talent in the fashion industry.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 3,
    title: "Mr and Miss Mombasa International Show",
    date: new Date(2024, 9, 20),
    location: "Mombasa, Coast Region",
    time: "7:00 PM - 10:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    description: "An international showcase celebrating beauty, talent, and culture. Featuring contestants from across the region competing for prestigious titles.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 4,
    title: "Mr and Miss Mbita",
    date: new Date(2024, 7, 10),
    location: "Mbita, Homa Bay County",
    time: "5:00 PM - 9:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "A local pageant celebrating the beauty and talent of Mbita's youth, promoting cultural values and community engagement.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 5,
    title: "Mr and Miss Fashion Mbita",
    date: new Date(2024, 7, 25),
    location: "Mbita, Homa Bay County",
    time: "6:00 PM - 10:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    description: "Fashion-focused competition showcasing innovative designs and modeling talent from the Mbita region.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 6,
    title: "Mr and Miss Culture Subaland",
    date: new Date(2024, 10, 5),
    location: "Subaland Region",
    time: "4:00 PM - 8:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    description: "Cultural pageant celebrating the rich heritage and traditions of the Subaland region through fashion, talent, and cultural presentations.",
    status: "upcoming",
    category: "Fashion & Modelling",
  },
  {
    id: 7,
    title: "Marketing Society of Kenya Workshop",
    date: new Date(2024, 9, 12),
    location: "Nairobi, Kenya",
    time: "9:00 AM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Professional development workshop covering the latest marketing trends, strategies, and best practices in the Kenyan market.",
    status: "past",
    category: "Marketing & Promotional",
  },
  {
    id: 8,
    title: "Marketing Society Networking Mixer",
    date: new Date(2024, 10, 15),
    location: "Nairobi, Kenya",
    time: "6:00 PM - 9:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "Networking event for marketing professionals to connect, share insights, and build meaningful business relationships.",
    status: "upcoming",
    category: "Marketing & Promotional",
  },
  {
    id: 9,
    title: "Brand Activation Event - Marketing Society",
    date: new Date(2024, 8, 28),
    location: "Nairobi, Kenya",
    time: "10:00 AM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
    description: "Interactive brand activation event featuring product launches, demonstrations, and engaging consumer experiences.",
    status: "past",
    category: "Marketing & Promotional",
  },
  {
    id: 10,
    title: "King Experience - Live Concert",
    date: new Date(2024, 9, 30),
    location: "Nairobi, Kenya",
    time: "7:00 PM - 11:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
    description: "Spectacular live concert featuring Prince Indah, Okello Max, and Kelechi Africana. An unforgettable night of music and entertainment.",
    status: "past",
    category: "Marketing & Promotional",
  },
  {
    id: 11,
    title: "Marketing Campaign Launch",
    date: new Date(2024, 11, 5),
    location: "Nairobi, Kenya",
    time: "2:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Launch event for major marketing campaigns, featuring guest speakers, strategy presentations, and networking opportunities.",
    fullDescription: "The Marketing Campaign Launch is a premier marketing and promotional event designed to showcase innovative marketing strategies and campaign methodologies that drive business growth and brand success. This exclusive gathering brings together industry leaders, marketing professionals, brand managers, and business executives to explore cutting-edge marketing trends, digital transformation strategies, and innovative campaign approaches that are reshaping the marketing landscape. As a marketing and promotional event, this launch features keynote presentations from renowned marketing strategists who will share insights on successful campaign execution, audience targeting, multi-channel marketing integration, and measuring marketing ROI. Attendees will have the opportunity to learn from real-world case studies of successful marketing campaigns, participate in interactive strategy workshops focused on campaign planning and execution, and network with peers from various industries. The event includes panel discussions on critical marketing topics such as social media marketing, content strategy, brand positioning, customer engagement, influencer marketing, and emerging marketing technologies. Whether you're launching a new product, rebranding your company, developing a comprehensive marketing strategy, or looking to enhance your existing marketing efforts, this marketing and promotional event provides valuable knowledge, practical tools, and strategic connections to help you achieve your marketing objectives. This event is specifically designed for marketing professionals, brand managers, business owners, and anyone involved in marketing and promotional activities who wants to stay ahead of industry trends and gain actionable insights to build more effective and impactful marketing campaigns.",
    status: "upcoming",
    category: "Marketing & Promotional",
  },
  {
    id: 12,
    title: "Corporate Sponsorship Launch",
    date: new Date(2024, 8, 20),
    location: "Nairobi, Kenya",
    time: "10:00 AM - 2:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Official launch event for corporate sponsorship partnerships, featuring stakeholder presentations and partnership announcements.",
    fullDescription: "The Corporate Sponsorship Launch is a prestigious corporate partnership event that marks the beginning of strategic alliances between leading corporations and Changer Fusions. This exclusive corporate partnership gathering brings together C-level executives, business leaders, corporate development managers, and key stakeholders to announce and celebrate new sponsorship initiatives that create mutually beneficial relationships. As a corporate partnership event, this launch focuses on building strategic business relationships that combine corporate resources with community-focused initiatives to drive both business growth and social impact. The event features detailed presentations on partnership opportunities, corporate social responsibility programs, sponsorship models, and collaborative initiatives that drive mutual growth, brand enhancement, and community development. Attendees will gain comprehensive insights into how corporate sponsorship can enhance brand visibility, support community development, create meaningful social change, and deliver measurable business value. The program includes networking sessions with potential corporate partners, partnership showcases highlighting successful corporate collaborations, and interactive discussions on sustainable business practices, corporate engagement strategies, and partnership best practices. This corporate partnership event is specifically designed for corporate leaders, business development executives, CSR managers, and organizations looking to expand their brand presence, engage with communities, build strategic alliances, and create partnerships that deliver both business value and social impact. Join us to explore how your organization can partner with Changer Fusions to create lasting positive change while achieving your corporate objectives.",
    status: "past",
    category: "Corporate Partnership",
  },
  {
    id: 13,
    title: "Joint Promotional Launch",
    date: new Date(2024, 10, 22),
    location: "Nairobi, Kenya",
    time: "11:00 AM - 3:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Collaborative promotional event showcasing joint initiatives between corporate partners and Changer Fusions.",
    fullDescription: "The Joint Promotional Launch is a dynamic corporate partnership event that celebrates and showcases collaborative initiatives between Changer Fusions and our corporate partners. This exciting corporate partnership gathering highlights innovative joint marketing campaigns, co-branded promotional initiatives, and strategic business partnerships that drive mutual business growth, market expansion, and brand enhancement. As a corporate partnership event, this launch demonstrates how collaborative efforts between organizations can create powerful synergies that benefit all parties involved. The event features live demonstrations of collaborative projects, interactive presentations on partnership success stories, exclusive previews of upcoming joint ventures, and detailed insights into how corporate partnerships can amplify marketing reach and effectiveness. Attendees will have the opportunity to learn about various partnership models, explore collaboration opportunities, understand the mechanics of successful corporate partnerships, and network with potential business partners. The program includes workshops on building effective partnerships, case study presentations showcasing successful corporate collaborations, and panel discussions featuring industry leaders who have successfully leveraged corporate partnerships for business growth. Whether you're a business looking to expand through strategic partnerships, a corporate leader seeking innovative collaboration opportunities, or an organization interested in co-branded promotional activities, this corporate partnership event provides valuable insights, practical frameworks, and networking platforms. Join us to discover how strategic corporate partnerships can amplify your brand reach, enhance your market presence, create mutually beneficial business relationships, and drive sustainable growth through collaborative initiatives.",
    status: "upcoming",
    category: "Corporate Partnership",
  },
  {
    id: 14,
    title: "Stakeholder Engagement Forum",
    date: new Date(2024, 9, 18),
    location: "Nairobi, Kenya",
    time: "9:00 AM - 1:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Strategic forum bringing together key stakeholders to discuss partnerships, collaborations, and future initiatives.",
    fullDescription: "The Stakeholder Engagement Forum is a strategic corporate partnership event designed to foster meaningful dialogue, collaboration, and relationship building between Changer Fusions and our key stakeholders, including corporate partners, business leaders, community leaders, government representatives, and industry experts. This comprehensive corporate partnership forum provides a dedicated platform for discussing current partnership initiatives, exploring future collaboration opportunities, addressing market challenges and opportunities, and developing strategies for long-term partnership success. As a corporate partnership event, this forum focuses on building and strengthening relationships with stakeholders who are essential to our collaborative success. The event features structured discussions on partnership strategies, collaborative project planning, stakeholder management, and long-term relationship building that are fundamental to successful corporate partnerships. Attendees will participate in interactive workshops on partnership development, strategic planning sessions focused on collaborative initiatives, and networking opportunities specifically designed to strengthen stakeholder relationships and identify new partnership opportunities. The forum covers critical topics such as corporate social responsibility in partnerships, sustainable business practices, community engagement through partnerships, innovative partnership models, stakeholder communication strategies, and measuring partnership success. This corporate partnership event is essential for corporate partners, business leaders, stakeholders, and organizations who want to stay informed about our partnership initiatives, contribute to strategic partnership planning, understand partnership opportunities, and build stronger collaborative relationships. Join us to be part of shaping the future of our corporate partnerships and collaborative endeavors, and to explore how you can engage with Changer Fusions as a strategic partner.",
    status: "past",
    category: "Corporate Partnership",
  },
  {
    id: 15,
    title: "Leadership Development Seminar",
    date: new Date(2024, 10, 8),
    location: "University Campus",
    time: "9:00 AM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Comprehensive seminar focused on developing leadership skills, strategic thinking, and professional growth for students and young professionals.",
    fullDescription: "The Leadership Development Seminar is an intensive, full-day educational and leadership event designed to equip students, young professionals, and emerging leaders with essential leadership skills, strategic thinking capabilities, and professional development competencies. This comprehensive educational and leadership seminar focuses on developing well-rounded leaders who can effectively navigate challenges, inspire teams, and drive positive change in their organizations and communities. As an educational and leadership event, this seminar covers a wide range of critical leadership topics including effective communication strategies, decision-making processes, team management techniques, conflict resolution skills, emotional intelligence development, and ethical leadership principles. Participants will engage in interactive workshops, case study analyses, role-playing exercises, and practical leadership challenges that help them develop their unique leadership style, enhance their professional capabilities, and build confidence in their leadership abilities. The seminar features presentations from experienced leaders, industry experts, and leadership coaches who share real-world insights, leadership best practices, and practical strategies for leadership success. Topics covered include building high-performing teams, managing change and uncertainty, developing strategic vision, creating inclusive work environments, motivating and inspiring others, public speaking and presentation skills, time management for leaders, and building personal leadership brand. Whether you're a student preparing for your career, a young professional looking to advance into leadership roles, an emerging leader seeking to enhance your capabilities, or someone aspiring to make a greater impact, this educational and leadership event provides valuable knowledge, practical tools, and leadership frameworks. Join us for a transformative learning experience that will help you become a more effective, confident, and impactful leader in your personal and professional life, and gain the skills necessary to lead with purpose and excellence.",
    status: "upcoming",
    category: "Educational & Leadership",
  },
  {
    id: 16,
    title: "Professional Development Panel Discussion",
    date: new Date(2024, 8, 25),
    location: "University Campus",
    time: "2:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Interactive panel discussion featuring industry experts sharing insights on career development and professional growth strategies.",
    fullDescription: "The Professional Development Panel Discussion is an engaging educational and leadership event that brings together a diverse group of industry experts, successful professionals, career coaches, and thought leaders to share valuable insights, experiences, and strategies on career development and professional growth. This interactive educational and leadership session features panelists from various industries including business, technology, marketing, finance, and entrepreneurship who discuss their unique career journeys, challenges they've overcome, key decisions that shaped their paths, and proven strategies that have contributed to their professional success. As an educational and leadership event, this panel discussion focuses on providing practical, actionable advice for professional development and career advancement. Topics covered include strategic career planning, essential skill development, effective networking strategies, work-life balance management, navigating career transitions and pivots, building a strong personal brand, developing industry expertise, mentorship and sponsorship, salary negotiation, and long-term career visioning. The discussion format encourages active audience participation, with structured opportunities to ask questions, seek personalized advice from the panelists, and engage in meaningful dialogue about professional development challenges and opportunities. Whether you're just starting your career and need guidance on building a strong foundation, considering a career change and seeking insights on making successful transitions, or looking to advance in your current field and accelerate your professional growth, this educational and leadership event provides practical advice, real-world perspectives, and inspiration. The event includes networking breaks where attendees can connect directly with panelists, exchange contact information, and build relationships with fellow professionals. Join us for an engaging afternoon of learning, inspiration, and professional growth that will equip you with the knowledge and connections needed to advance your career and achieve your professional goals.",
    status: "past",
    category: "Educational & Leadership",
  },
  {
    id: 17,
    title: "Skill-Building Workshop Series",
    date: new Date(2024, 11, 10),
    location: "University Campus",
    time: "10:00 AM - 3:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Hands-on workshop series covering essential skills for career success, including communication, problem-solving, and digital literacy.",
    fullDescription: "The Skill-Building Workshop Series is a comprehensive, hands-on educational and leadership program designed to develop essential skills that are crucial for career success, professional growth, and leadership effectiveness in today's competitive job market. This intensive educational and leadership workshop series focuses on building a well-rounded skill set that combines technical competencies with soft skills and leadership capabilities. As an educational and leadership event, this series covers multiple critical skill areas including effective communication (both written and verbal), critical thinking and analytical reasoning, creative problem-solving techniques, digital literacy and technology proficiency, time management and productivity strategies, teamwork and collaboration, presentation and public speaking skills, emotional intelligence, adaptability and resilience, and professional networking. Each workshop session is highly interactive and practical, featuring hands-on exercises, role-playing activities, case studies, real-world scenarios, and collaborative projects that help participants apply what they learn immediately in their academic, professional, and personal contexts. The series is thoughtfully structured to build upon each session, creating a progressive learning experience that systematically enhances both personal and professional capabilities while developing leadership potential. Participants will work on individual and group projects, participate in team-based activities, engage in peer learning, and receive personalized feedback from experienced facilitators and industry professionals. The workshops are specifically designed for students preparing for their careers, recent graduates entering the job market, young professionals looking to advance, and emerging leaders seeking to enhance their leadership capabilities. By the end of the series, participants will have developed a comprehensive portfolio of skills, gained confidence in their abilities, built a network of peers and mentors, and acquired practical tools and frameworks that give them a competitive edge in their career journey. Join us for this transformative educational and leadership experience that will equip you with the essential skills needed to succeed in today's dynamic professional environment and become an effective leader in your chosen field.",
    status: "upcoming",
    category: "Educational & Leadership",
  },
  {
    id: 18,
    title: "Student Leadership Forum",
    date: new Date(2024, 9, 5),
    location: "University Campus",
    time: "1:00 PM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Forum for student leaders to discuss challenges, share experiences, and develop strategies for effective leadership in academic and community settings.",
    fullDescription: "The Student Leadership Forum is a dedicated educational and leadership platform designed specifically for student leaders from various academic institutions, student organizations, and community groups to come together, share experiences, collaborate on leadership challenges, and develop their leadership capabilities. This interactive educational and leadership forum provides a supportive and inclusive space for student leaders to discuss common issues they face in their leadership roles, such as managing diverse teams, organizing successful events, balancing academic responsibilities with leadership commitments, motivating and inspiring peers, handling conflicts, making difficult decisions, and building sustainable organizations. As an educational and leadership event, this forum focuses on developing practical leadership skills, building leadership confidence, and creating a network of student leaders who can support and learn from each other. The forum features structured discussions on leadership topics, breakout sessions for focused conversations, collaborative problem-solving activities that address real leadership challenges, peer learning opportunities, and mentorship sessions with experienced leaders. Experienced mentors, leadership coaches, and advisors facilitate discussions and provide guidance on effective leadership practices, ethical leadership principles, and strategies for overcoming common leadership obstacles. Topics covered include team building and team dynamics, conflict resolution and mediation, project management and event planning, public speaking and communication, community engagement and social impact, strategic planning and goal setting, time management for leaders, building organizational culture, and developing personal leadership style. The forum also includes dedicated networking opportunities where student leaders can connect with peers from other institutions, share best practices and success stories, exchange ideas and strategies, and build lasting professional relationships that extend beyond the forum. Whether you're a student council member, club president, organization leader, community organizer, or an aspiring leader looking to develop your leadership potential, this educational and leadership event provides valuable insights, practical tools, peer support, and mentorship. Join us to connect with fellow student leaders, gain new perspectives on leadership, enhance your leadership capabilities, and become part of a community of emerging leaders who are making a positive impact in their institutions and communities.",
    status: "past",
    category: "Educational & Leadership",
  },
  {
    id: 19,
    title: "Campus Town Hall Meeting",
    date: new Date(2024, 10, 12),
    location: "University Campus",
    time: "3:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Open town hall meeting providing students with a platform to voice concerns, share ideas, and engage with campus leadership.",
    fullDescription: "The Campus Town Hall Meeting is an open, inclusive student engagement event designed to foster transparent communication, active dialogue, and meaningful collaboration between students and campus leadership. This democratic student engagement platform provides students with a direct opportunity to voice their concerns, share innovative ideas, ask questions, provide feedback, and engage directly with administrators, faculty members, student representatives, and campus decision-makers. As a student engagement event, this town hall meeting creates a space where student voices are not only heard but actively influence campus policies, programs, and initiatives. The meeting covers a comprehensive range of topics that directly impact student life including campus facilities and infrastructure, academic programs and curriculum, student services and support systems, campus policies and regulations, safety and security measures, housing and accommodation, dining services, transportation, extracurricular activities and clubs, career services, mental health resources, diversity and inclusion initiatives, and future campus development plans. The format encourages active student participation, with structured time for questions, suggestions, open dialogue, and collaborative problem-solving. Campus leadership uses this student engagement forum to share updates on ongoing projects, respond directly to student feedback, discuss plans for campus improvements, explain policy decisions, and gather input on future initiatives. This is an essential student engagement event for students who want to be actively involved in shaping their campus experience, ensuring their voices are heard, influencing positive change, and contributing to a better campus community for all. Whether you have specific concerns to raise, innovative ideas to share, questions about campus policies, or simply want to stay informed about campus developments and have your voice included in decision-making processes, this town hall meeting provides the perfect platform. Join us to be part of the conversation, make your voice heard, and help make a positive and lasting impact on your campus community through active student engagement.",
    status: "upcoming",
    category: "Student Engagement",
  },
  {
    id: 20,
    title: "Student Feedback Forum",
    date: new Date(2024, 8, 15),
    location: "University Campus",
    time: "2:00 PM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Interactive forum designed to gather student feedback on campus services, programs, and initiatives to improve student experience.",
    fullDescription: "The Student Feedback Forum is a dedicated student engagement event designed to actively gather comprehensive, meaningful feedback from students about various aspects of campus life, student services, and the overall campus experience. This interactive student engagement forum focuses on creating multiple channels for student input and ensuring that student voices directly influence campus improvements and service enhancements. As a student engagement event, this forum covers all critical areas of student life including academic services and support, student support programs and resources, campus facilities and infrastructure, dining services and food options, housing and accommodation, transportation and accessibility, extracurricular activities and clubs, career services, health and wellness services, technology resources, library services, and campus safety. This interactive student engagement forum uses multiple feedback collection methods to ensure all students can participate in ways that are comfortable for them, including structured surveys, focus group discussions, one-on-one interviews, open suggestion sessions, digital feedback platforms, and interactive workshops. The feedback collected during this student engagement forum is carefully analyzed, categorized, and used to inform decision-making processes, improve existing services, develop new initiatives that better meet student needs, allocate resources more effectively, and prioritize campus improvements based on student priorities. The forum provides a structured, respectful environment where students can share both positive feedback about what's working well and constructive criticism about areas that need improvement, all in a manner that leads to actionable outcomes. Campus administrators, service providers, and decision-makers attend the forum to listen directly to student perspectives, respond to concerns, explain constraints and opportunities, and commit to specific actions based on student feedback. This student engagement event is crucial for ensuring that student voices are heard, valued, and acted upon, and that campus services continue to evolve to meet changing student needs and expectations. Your participation in this student engagement forum directly contributes to improving the campus experience for all students, both current and future. Join us to share your thoughts, experiences, suggestions, and ideas for making our campus an even better place to learn, grow, and thrive. Your voice matters, and this forum is designed to ensure it makes a real difference.",
    status: "past",
    category: "Student Engagement",
  },
  {
    id: 21,
    title: "Student Engagement Drive",
    date: new Date(2024, 11, 15),
    location: "University Campus",
    time: "10:00 AM - 2:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Campus-wide engagement drive encouraging student participation in activities, clubs, and campus initiatives to foster a vibrant campus community.",
    fullDescription: "The Student Engagement Drive is a comprehensive, campus-wide student engagement initiative designed to inspire, encourage, and facilitate student participation in various activities, clubs, organizations, campus programs, and community initiatives. This dynamic student engagement event showcases the diverse and extensive range of opportunities available on campus, creating pathways for students to get involved, build connections, develop skills, and make the most of their campus experience. As a student engagement event, this drive highlights opportunities across multiple categories including academic clubs and honor societies, professional organizations and career-focused groups, sports teams and athletic programs, cultural groups and diversity organizations, volunteer programs and community service initiatives, special interest societies and hobby clubs, student government and leadership positions, arts and performance groups, entrepreneurship and innovation programs, and social and recreational activities. The drive features interactive booths where students can learn about different organizations, live demonstrations showcasing what each group does, performances from various student groups, presentations from student leaders, and hands-on activities that give students a taste of different engagement opportunities. Student leaders, organization representatives, and campus engagement coordinators are available throughout the event to answer questions, share their personal experiences, explain the benefits of getting involved, and help students find activities that match their interests, goals, and schedules. The event also includes informative workshops on topics such as getting involved in campus life, building leadership skills through engagement, balancing academics with extracurricular activities, making the most of campus resources, building a strong campus network, and developing time management skills for engaged students. Whether you're interested in joining an existing club, starting a new organization, participating in community service, exploring new interests, building your resume, making new friends, developing leadership skills, or simply finding your place on campus, this student engagement drive provides the perfect starting point and comprehensive resource. Research consistently shows that engaged students have better academic performance, stronger social connections, greater satisfaction with their college experience, improved career readiness, enhanced leadership skills, and higher overall well-being. Join us to discover how you can get involved, find your community, develop new skills, and make your campus experience more enriching, fulfilling, and transformative. This student engagement event is your gateway to a more connected, active, and rewarding campus life.",
    status: "upcoming",
    category: "Student Engagement",
  },
];

const getEventById = (id: number) => {
  return allEvents.find((e) => e.id === id);
};

export default function EventDetailPage() {
  const params = useParams();
  const event = getEventById(Number(params.id));
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  if (!event) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events" className="btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 3000);
  };

  // Gallery images for each event - using existing event images
  const getGalleryImages = (eventId: number) => {
    const galleryMap: { [key: number]: string[] } = {
      1: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
      ],
      11: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
      ],
      12: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      ],
      13: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      ],
      14: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      ],
      15: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      ],
    };
    return galleryMap[eventId] || [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    ];
  };


  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/events"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Description Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    {event.category}
                  </span>
                  <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                    event.status === "upcoming" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {event.status === "upcoming" ? "Upcoming" : "Past Event"}
                  </span>
                </div>
                <h1 className="text-4xl font-bold mb-6 text-gray-900">{event.title}</h1>
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                    {"fullDescription" in event && event.fullDescription ? event.fullDescription : event.description}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Gallery Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <ImageIcon className="w-6 h-6 text-primary-600" />
                  <h2 className="text-3xl font-bold text-gray-900">Event Gallery</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getGalleryImages(event.id).map((imageUrl, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <Image
                        src={imageUrl}
                        alt={`${event.title} - Image ${index + 1}`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Contact Us Form */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg p-6 sticky top-24"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900">Contact Us</h2>
              <p className="text-sm text-gray-600 mb-6">
                Have questions about this event? Get in touch with us.
              </p>
              {contactSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold mb-2 text-gray-900">Message Sent!</h3>
                  <p className="text-sm text-gray-600">We'll get back to you soon.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name (Individual/Company) *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactFormData.name}
                      onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactFormData.email}
                      onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={contactFormData.phone}
                      onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactFormData.subject}
                      onChange={(e) => setContactFormData({ ...contactFormData, subject: e.target.value })}
                      placeholder={`Inquiry about ${event.title}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactFormData.message}
                      onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary inline-flex items-center justify-center text-sm py-2"
                  >
                    Send Message
                    <Send className="ml-2 w-4 h-4" />
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
