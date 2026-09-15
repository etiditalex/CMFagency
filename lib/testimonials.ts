export type TestimonialSource = "dashboard" | "event_review";

export type Testimonial = {
  id: number;
  name: string;
  role: string;
  quote: string;
  image_url: string;
  rating: number | null;
  event_slug: string | null;
  event_title: string | null;
  reviewer_email?: string | null;
  source: TestimonialSource;
  show_on_home: boolean;
  show_on_testimonials_page: boolean;
  is_active: boolean;
  sort_order: number;
};

export const TESTIMONIAL_SELECT =
  "id,name,role,quote,image_url,rating,event_slug,event_title,reviewer_email,source,show_on_home,show_on_testimonials_page,is_active,sort_order";

export const TESTIMONIAL_PUBLIC_SELECT = "id,name,role,quote,image_url,rating,event_title,sort_order";

export const FALLBACK_HOME_STORIES: Array<Pick<Testimonial, "id" | "name" | "role" | "quote" | "image_url">> = [
  {
    id: -1,
    name: "Amina Wanjiku",
    role: "Marketing Lead, Coastal Brands",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892261/IMG_9817_qlxozr.jpg",
    quote:
      "Working with Changer Fusions on our launch week changed how we show up. They planned the room, ran the campaign, and kept guests moving through Fusion Xpress without us chasing three vendors. Briefings, guest flow, and the posts that followed all sat in one plan, so the brand felt the same in the hall and on the phone the next morning.",
  },
  {
    id: -2,
    name: "Brian Otieno",
    role: "Founder, Studio North",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892256/IMG_0331_zz7s2k.jpg",
    quote:
      "We needed an event that still worked online the next morning. Their team treated ticketing, content, and the live moment as one brief. The run of show was clear, the campaign stayed live after last call, and we did not have to rebuild the story for social from scratch.",
  },
  {
    id: -3,
    name: "Faith Chebet",
    role: "Talent, Coast programme",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1768448263/HighFashionAudition20251_ufpxud.jpg",
    quote:
      "From audition floor to the awards night, the process was clear. I always knew the next step, and the team treated talent with the same care they give the brand on stage. Call times, looks, and the live moment were written down, so nobody was guessing, and the show still felt personal when the lights came up.",
  },
  {
    id: -4,
    name: "Daniel Mwangi",
    role: "Operations Manager",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892258/IMG_0373_e07xid.jpg",
    quote:
      "Run-of-show, vendors, and guest flow stayed tight. Changer Fusions made a complex day feel simple for our staff and for the people walking in the door. Radios, timings, and the last-minute changes all came through one desk, which meant the floor stayed calm even when the programme shifted.",
  },
  {
    id: -5,
    name: "Lillian Achieng",
    role: "Campaign Client",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1767153675/Global_women_impact_2_adeysa.jpg",
    quote:
      "The digital work did not stop when the event ended. Posts, tickets, and follow-up sat in one place, so the brand stayed visible after the last guest left. We could see who came, who voted, and what to send next week without opening five tools, which is the part of the brief we keep coming back to.",
  },
  {
    id: -6,
    name: "Peter Kamau",
    role: "Events Partner",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892255/IMG_0320_xc3kuq.jpg",
    quote:
      "We asked for a partner who could plan, promote, and measure. Changer Fusions did the three together, which is why we keep coming back. The event brief, the Fusion Xpress tickets, and the campaign report arrived as one thread, so our team spent the week on guests instead of chasing files.",
  },
];

export const FALLBACK_TESTIMONIALS_PAGE: Array<
  Pick<Testimonial, "id" | "name" | "role" | "quote" | "image_url" | "rating">
> = [
  {
    id: -11,
    name: "Haron Waswa",
    role: "Mr. Climate Kenya 2023-2025",
    image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    rating: 4.5,
    quote:
      "Haron Waswa is the Flag Carrier for Mr. Climate Kenya 2023–2025 and also crowned Mr. Cambridge University. He is the former Mr. Rectified Eldoret, and currently the Mr. Kitenge Fashion Fest, a prestigious platform that showcases authentic cultural fabrics in fashion. He is Passionate, visionary, and committed, I continue to stand at the frontline of climate advocacy, community empowerment, and sustainable development.",
  },
  {
    id: -12,
    name: "Sarah Johnson",
    role: "CEO, TechCorp Inc.",
    image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    rating: 5,
    quote:
      "Changer Fusions transformed our event planning process. Their attention to detail and creative approach made our annual conference a huge success. The team's professionalism and dedication to excellence is unmatched. Highly recommended!",
  },
  {
    id: -13,
    name: "Michael Chen",
    role: "Marketing Director, GreenLife",
    image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    rating: 5,
    quote:
      "Working with Changer Fusions has been a game-changer for our brand. Their marketing strategies and portfolio of work speak for themselves. They understand our vision and deliver exceptional results every time.",
  },
  {
    id: -14,
    name: "Emily Rodriguez",
    role: "Event Coordinator, EventPro",
    image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    rating: 4.5,
    quote:
      "The team at Changer Fusions is professional, creative, and always delivers on time. They've helped us execute multiple successful events with seamless planning. Their expertise in event management is truly remarkable.",
  },
  {
    id: -15,
    name: "David Thompson",
    role: "Founder, StartupHub",
    image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
    rating: 5,
    quote:
      "Changer Fusions' comprehensive approach to marketing and event planning helped us establish our brand in the market. Their expertise is unmatched, and they truly care about their clients' success.",
  },
];

export function isMissingTestimonialsTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = String(err.message ?? "").toLowerCase();
  const code = String(err.code ?? "");
  return code === "42P01" || (msg.includes("testimonials") && msg.includes("does not exist"));
}

export function testimonialInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CF";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
