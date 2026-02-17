"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, CalendarPlus, Download, MapPin, ArrowLeft, ExternalLink, Star, Send, CheckCircle, Ticket } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  full_description: string | null;
  venue: string | null;
  hosted_by: string | null;
  gallery: string[] | null;
  ticket_campaign_slug: string | null;
  payment_link: string | null;
  document_url: string | null;
  document_label: string | null;
  map_url: string | null;
};

function buildGoogleCalendarUrl(event: { title: string; event_date: string; end_date?: string | null; location?: string | null; description?: string | null }): string {
  const d = event.event_date.replace(/-/g, "");
  const endD = (event.end_date || event.event_date).replace(/-/g, "");
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${d}T090000/${endD}T170000` +
    `&details=${encodeURIComponent(event.description || "")}` +
    `&location=${encodeURIComponent(event.location || "")}`
  );
}

const pastEventsData: { [key: string]: any } = {
  "mr-mrs-deaf-kenya-2025": {
    title: "Mr and Mrs Deaf Kenya 2025",
    date: new Date(2025, 0, 15),
    location: "Kenya",
    description: "A prestigious event celebrating the beauty, talent, and achievements of the deaf community in Kenya. This inclusive event showcased the remarkable abilities and contributions of deaf individuals, promoting awareness, inclusion, and empowerment.",
    fullDescription: "Mr and Mrs Deaf Kenya 2025 was a groundbreaking event that celebrated the beauty, talent, and remarkable achievements of the deaf community in Kenya. This prestigious pageant went beyond traditional beauty contests to showcase the incredible abilities, resilience, and contributions of deaf individuals across the nation. The event featured contestants from various regions of Kenya who competed for the prestigious titles, demonstrating their talents, advocacy work, cultural heritage, and positive impact on society. The event included multiple competition segments including talent showcases, cultural presentations, evening wear competitions, and question-and-answer sessions that highlighted contestants' intelligence, confidence, and commitment to advocacy. Beyond the competition, this pageant served as a powerful platform for promoting awareness about deaf culture, breaking down barriers, challenging stereotypes, and advocating for inclusion and accessibility.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
    ],
  },
  "global-women-empowerment-summit-2025": {
    title: "Global Women Empowerment Summit",
    date: new Date(2025, 8, 1),
    location: "Kenya",
    hostedBy: "Global Women Impact Foundation",
    description: "Hosted by Global Women Impact Foundation, this summit brought together women leaders and advocates for empowerment and equality.",
    fullDescription: "The Global Women Empowerment Summit 2025, hosted by Global Women Impact Foundation, was a transformative gathering that brought together women leaders, advocates, entrepreneurs, and change-makers from across Kenya and beyond. This powerful summit focused on creating platforms for women to share their experiences, learn from each other, and develop strategies for advancing gender equality and women's empowerment. The event featured keynote presentations from renowned women leaders, interactive workshops on leadership development, entrepreneurship, financial literacy, and personal growth. Panel discussions covered critical topics such as women in leadership, breaking glass ceilings, work-life balance, mentorship, and creating supportive networks. The summit also included networking sessions, mentorship opportunities, and collaborative activities designed to build lasting connections among participants. This event served as a catalyst for positive change, inspiring women to pursue their goals, overcome challenges, and make meaningful contributions to their communities and the broader society.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_1_q8cocr.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_3_fqzt05.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_4_c9cywi.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_5_krzjoo.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153674/Global_women_impact_6_xl6jy0.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153674/Global_women_impact_7_x03yll.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_8_nbsujm.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_9_axod1r.jpg",
    ],
  },
  "kings-experience-coast-edition-2025": {
    title: "The Kings Experience Coast Edition",
    date: new Date(2025, 8, 15),
    location: "Coast Region, Kenya",
    description: "An unforgettable entertainment experience featuring top artists and performers from the coast region.",
    fullDescription: "The Kings Experience Coast Edition 2025 was a spectacular entertainment extravaganza that brought together the best of music, culture, and entertainment from the coast region of Kenya. This unforgettable event featured top artists, musicians, and performers who delivered electrifying performances that captivated audiences throughout the night. The event showcased the rich cultural heritage of the coast region while celebrating contemporary music and entertainment. Attendees enjoyed a diverse lineup of performances including traditional coastal music, modern hits, dance performances, and special guest appearances. The event created an atmosphere of celebration, unity, and cultural pride, bringing together people from all walks of life to enjoy world-class entertainment in a vibrant, festive setting.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154664/The_Kings_Experience_1_ime4hx.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_2_fixdek.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_3_yjdp7a.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_4_rcq1m6.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154666/The_Kings_Experience_5_ipmrbq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_6_rd96ib.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154666/The_Kings_Experience_7_mpvtww.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg",
    ],
  },
  "mombasa-international-show-2025": {
    title: "Mombasa International Show 2025",
    date: new Date(2025, 8, 20),
    location: "Mombasa, Kenya",
    description: "A grand international showcase celebrating culture, talent, and excellence in Mombasa.",
    fullDescription: "Mombasa International Show 2025 was a grand celebration of culture, talent, and excellence that brought together participants and audiences from across the region and beyond. This prestigious event showcased the best of Mombasa's cultural heritage, artistic talent, and international appeal. The show featured a diverse range of activities including cultural performances, talent competitions, fashion showcases, and exhibitions that highlighted the unique character and vibrancy of Mombasa. The event served as a platform for local talent to shine on an international stage, promoting cultural exchange, tourism, and economic development in the region. It was a celebration of diversity, creativity, and the rich cultural tapestry that makes Mombasa a special place.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    ],
  },
  "coast-fashions-modelling-awards-2025": {
    title: "Coast Fashions and Modelling Awards 2025",
    date: new Date(2025, 4, 15),
    location: "Coast Region, Kenya",
    description: "Celebrating excellence in fashion and modeling along the Kenyan coast with prestigious awards.",
    fullDescription: "The Coast Fashions and Modelling Awards 2025 was a glamorous celebration of excellence in the fashion and modeling industry along the Kenyan coast. This prestigious awards ceremony recognized and honored the outstanding achievements of designers, models, stylists, photographers, and other professionals who have made significant contributions to the fashion industry in the region. The event featured stunning fashion showcases, runway presentations, and award ceremonies that highlighted creativity, innovation, and excellence in fashion design and modeling. It brought together industry professionals, fashion enthusiasts, and supporters to celebrate the vibrant fashion scene on the coast and recognize those who are shaping the future of fashion in Kenya.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards4_iuxpzz.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards5_ck7oxp.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards6_ivhbxz.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards7_gaptfq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards10_zl8o43.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards12_cfsz68.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037230/CoastFashionsandmodellingawards13_g3wcsz.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards14_mqjq7b.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037230/CoastFashionsandmodellingawards15_tncu7p.jpg",
    ],
  },
  "marketing-students-conference-2025": {
    title: "Marketing Students Conference",
    date: new Date(2025, 2, 10),
    location: "Nairobi, Kenya",
    venue: "St. Paul's University",
    description: "A comprehensive conference for marketing students held at St. Paul's University, featuring industry insights and networking opportunities.",
    fullDescription: "The Marketing Students Conference 2025, held at St. Paul's University in Nairobi, was a comprehensive educational event designed specifically for marketing students. This conference provided students with valuable insights into the marketing industry, career opportunities, and the latest trends and practices in marketing. The event featured presentations from industry professionals, case study analyses, interactive workshops, and networking sessions that helped students connect with potential employers and mentors. Topics covered included digital marketing strategies, brand management, consumer behavior, marketing analytics, social media marketing, and career development in the marketing field. The conference served as a bridge between academic learning and real-world marketing practice, equipping students with practical knowledge and skills needed to succeed in their marketing careers.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    ],
  },
  "miss-valentines-mombasa-2025": {
    title: "Crowning of Miss Valentines Mombasa 2025",
    date: new Date(2025, 1, 14),
    location: "Mombasa, Kenya",
    description: "A glamorous beauty pageant celebrating love and beauty in Mombasa with the crowning of Miss Valentines.",
    fullDescription: "The Crowning of Miss Valentines Mombasa 2025 was a glamorous and romantic beauty pageant that celebrated love, beauty, and elegance in Mombasa. This special Valentine's Day event brought together contestants who competed in various segments including evening wear, talent showcases, and question-and-answer sessions. The pageant was a celebration of inner and outer beauty, confidence, and grace, with the winner being crowned as Miss Valentines Mombasa 2025. The event featured stunning performances, elegant fashion presentations, and a festive atmosphere that captured the spirit of love and celebration. It was a memorable evening that brought together the community to celebrate beauty, talent, and the special occasion of Valentine's Day.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    ],
  },
  "mr-miss-mombasa-international-show": {
    title: "Mr and Miss Mombasa International Show",
    date: new Date(2025, 8, 25),
    location: "Mombasa, Kenya",
    description: "An international showcase celebrating beauty, talent, and culture with contestants from across the region.",
    fullDescription: "The Mr and Miss Mombasa International Show was a prestigious international beauty and talent pageant that celebrated beauty, talent, and cultural diversity. This grand event featured contestants from across the region competing for the titles of Mr and Miss Mombasa International. The pageant included multiple competition segments showcasing contestants' talents, cultural presentations, fashion sense, intelligence, and advocacy work. The event served as a platform for promoting cultural exchange, celebrating diversity, and recognizing outstanding individuals who represent the best of Mombasa's youth. It was a celebration of beauty, talent, culture, and the international character of Mombasa as a cosmopolitan city.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    ],
  },
  "coast-students-conference-2025": {
    title: "Coast Students Conference",
    date: new Date(2025, 8, 30),
    location: "Pwani University, Kenya",
    venue: "Pwani University",
    description: "A dynamic conference bringing together students from the coast region for learning, networking, and collaboration.",
    fullDescription: "The Coast Students Conference 2025, held at Pwani University, was a dynamic and engaging event that brought together students from various institutions across the coast region. This conference provided a platform for students to learn, network, collaborate, and share ideas on topics relevant to their academic and professional development. The event featured presentations, workshops, panel discussions, and interactive sessions covering a wide range of subjects including leadership development, career planning, entrepreneurship, academic excellence, and community engagement. The conference fostered a sense of community among students from the coast region, encouraging collaboration, knowledge sharing, and mutual support. It was an opportunity for students to connect with peers, learn from experienced professionals, and develop skills that will benefit them in their academic and professional journeys.",
    gallery: [
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    ],
  },
};

export default function PastEventDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const slugParam = Array.isArray(idParam) ? idParam[0] : idParam;

  const hardcodedEvent = slugParam ? pastEventsData[slugParam] : undefined;
  const [dbEvent, setDbEvent] = useState<DbEvent | null>(null);
  const [loading, setLoading] = useState(!!slugParam && !hardcodedEvent);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (hardcodedEvent || !slugParam) {
      if (!slugParam) setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,description,full_description,venue,hosted_by,gallery,ticket_campaign_slug,payment_link,document_url,document_label,map_url")
        .eq("slug", slugParam)
        .lt("event_date", format(new Date(), "yyyy-MM-dd"))
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) setDbEvent(data as DbEvent);
        else setNotFound(true);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hardcodedEvent, slugParam]);

  const event = hardcodedEvent ?? (dbEvent ? {
    title: dbEvent.title,
    date: new Date(dbEvent.event_date),
    location: dbEvent.location ?? "",
    description: dbEvent.description ?? "",
    fullDescription: dbEvent.full_description ?? undefined,
    venue: dbEvent.venue,
    hostedBy: dbEvent.hosted_by,
    gallery: Array.isArray(dbEvent.gallery) ? dbEvent.gallery : undefined,
    ticket_campaign_slug: dbEvent.ticket_campaign_slug,
    payment_link: dbEvent.payment_link,
    document_url: dbEvent.document_url,
    document_label: dbEvent.document_label,
    map_url: dbEvent.map_url,
  } : undefined);

  const showActionGrid = !!dbEvent;

  const [reviewFormData, setReviewFormData] = useState({
    name: "",
    email: "",
    rating: 5,
    review: "",
  });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event || notFound) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events/past" className="btn-primary">
            Back to Past Events
          </Link>
        </div>
      </div>
    );
  }

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setReviewFormData({ name: "", email: "", rating: 5, review: "" });
    }, 3000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/events/past"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Past Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg"
            >
              <div className="p-8">
                <h1 className="text-4xl font-bold mb-6 text-gray-900">{event.title}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-6 h-6 text-primary-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">Date</div>
                      <div className="text-gray-600">{format(event.date, "EEEE, MMMM d, yyyy")}</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-6 h-6 text-primary-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">Location</div>
                      <div className="text-gray-600">{event.location}</div>
                      {event.venue && (
                        <div className="text-sm text-gray-500 mt-1">Venue: {event.venue}</div>
                      )}
                      {event.hostedBy && (
                        <div className="text-sm text-gray-500 mt-1">Hosted by: {event.hostedBy}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                    {event.fullDescription || event.description}
                  </p>
                </div>
                {showActionGrid && dbEvent && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {dbEvent.ticket_campaign_slug && (
                      <a
                        href={`/${dbEvent.ticket_campaign_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 transition-colors"
                      >
                        <Ticket className="w-5 h-5" />
                        Buy Ticket
                      </a>
                    )}
                    {dbEvent.payment_link && (
                      <a
                        href={dbEvent.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Pay
                      </a>
                    )}
                    {dbEvent.document_url && (
                      <a
                        href={dbEvent.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold py-3 px-4 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        {dbEvent.document_label || "Download"}
                      </a>
                    )}
                    {dbEvent.map_url && (
                      <a
                        href={dbEvent.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 hover:border-primary-500 text-gray-700 hover:text-primary-600 font-semibold py-3 px-4 transition-colors"
                      >
                        <MapPin className="w-5 h-5" />
                        View on Map
                      </a>
                    )}
                    <a
                      href={buildGoogleCalendarUrl(dbEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 hover:border-primary-500 text-gray-700 hover:text-primary-600 font-semibold py-3 px-4 transition-colors"
                    >
                      <CalendarPlus className="w-5 h-5" />
                      Add to Calendar
                    </a>
                  </div>
                )}
              </div>
            </motion.div>


            {/* Review Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg"
            >
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-gray-900">Share Your Review</h2>
                {reviewSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">Thank You!</h3>
                    <p className="text-gray-600">Your review has been submitted successfully.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="review-name"
                          name="reviewName"
                          required
                          value={reviewFormData.name}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="review-email"
                          name="reviewEmail"
                          required
                          value={reviewFormData.email}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating *
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewFormData({ ...reviewFormData, rating: star })}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= reviewFormData.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-gray-600">({reviewFormData.rating} out of 5)</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review *
                      </label>
                      <textarea
                        id="review-text"
                        name="reviewText"
                        required
                        rows={6}
                        value={reviewFormData.review}
                        onChange={(e) => setReviewFormData({ ...reviewFormData, review: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Share your experience at this event..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full btn-primary inline-flex items-center justify-center"
                    >
                      Submit Review
                      <Send className="ml-2 w-5 h-5" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Feedback Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white rounded-xl shadow-lg"
            >
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-gray-900">Event Feedback</h2>
                <p className="text-gray-600 mb-6">
                  We value your feedback! Your thoughts help us improve future events. Share your experience, suggestions, or any comments about this event.
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-700 italic">
                    "Thank you for attending {event.title}. We hope you had a wonderful experience. 
                    Your feedback is important to us and helps us create even better events in the future."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Contact Form */}
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
                      id="past-event-contact-name"
                      name="name"
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
                      id="past-event-contact-email"
                      name="email"
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
                      id="past-event-contact-phone"
                      name="phone"
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
                      id="past-event-contact-subject"
                      name="subject"
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
                      id="past-event-contact-message"
                      name="message"
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

