"use client";

import { motion } from "framer-motion";
import { Calendar, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useParams } from "next/navigation";

// News data - matching the NewsSection component
const newsItems = [
  {
    id: 1,
    title: "New Event Management Features Launched",
    excerpt: "We've introduced advanced booking tools and calendar integrations to enhance your event planning experience.",
    date: new Date(2024, 4, 15),
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
    category: "Platform Updates",
    content: `
      <p class="mb-4">We're excited to announce the launch of our new event management features that will revolutionize how you plan and manage events.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Advanced Booking Tools</h2>
      <p class="mb-4">Our new booking system allows you to create custom registration forms, manage attendee lists, and track RSVPs in real-time. You can now set capacity limits, create waitlists, and send automated confirmation emails.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Calendar Integrations</h2>
      <p class="mb-4">Seamlessly integrate with popular calendar applications including Google Calendar, Outlook, and Apple Calendar. Your events will automatically sync across all your devices, ensuring you never miss an important date.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Enhanced User Experience</h2>
      <p class="mb-4">We've redesigned the event creation interface to be more intuitive and user-friendly. The new drag-and-drop interface makes it easier than ever to organize your events and manage your schedule.</p>
      
      <p class="mb-4">These updates are part of our ongoing commitment to providing you with the best event management tools available. We're constantly working to improve our platform based on your feedback.</p>
    `,
  },
  {
    id: 2,
    title: "Marketing Trends for 2024",
    excerpt: "Discover the latest marketing strategies and trends that are shaping the industry this year.",
    date: new Date(2024, 4, 10),
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
    category: "Industry Insights",
    content: `
      <p class="mb-4">As we navigate through 2024, the marketing landscape continues to evolve at a rapid pace. Here are the key trends that are shaping the industry this year.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">AI-Powered Marketing</h2>
      <p class="mb-4">Artificial Intelligence is transforming how marketers create content, analyze data, and engage with customers. From chatbots to predictive analytics, AI is becoming an essential tool for modern marketing teams.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Sustainability and Purpose-Driven Marketing</h2>
      <p class="mb-4">Consumers are increasingly looking for brands that align with their values. Companies that prioritize sustainability and social responsibility are seeing stronger customer loyalty and brand advocacy.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Video Content Dominance</h2>
      <p class="mb-4">Video continues to be the most engaging form of content. Short-form videos, live streaming, and interactive video experiences are driving higher engagement rates across all platforms.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Personalization at Scale</h2>
      <p class="mb-4">Advanced data analytics and automation tools are enabling marketers to deliver highly personalized experiences to large audiences. This personalization is becoming the standard, not the exception.</p>
      
      <p class="mb-4">Staying ahead of these trends is crucial for marketing success in 2024. By embracing new technologies and strategies, businesses can create more meaningful connections with their audiences.</p>
    `,
  },
  {
    id: 3,
    title: "Career Development Workshop Series",
    excerpt: "Join our comprehensive workshop series designed to help professionals advance their careers.",
    date: new Date(2024, 4, 5),
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    category: "Training",
    content: `
      <p class="mb-4">We're thrilled to announce our new Career Development Workshop Series, designed to empower professionals at all stages of their careers.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Workshop Topics</h2>
      <p class="mb-4">Our comprehensive series covers essential career development topics including:</p>
      <ul class="list-disc list-inside mb-4 space-y-2">
        <li>Resume Writing and LinkedIn Optimization</li>
        <li>Interview Skills and Negotiation Techniques</li>
        <li>Networking Strategies and Building Professional Relationships</li>
        <li>Leadership Development and Management Skills</li>
        <li>Digital Skills and Technology Proficiency</li>
        <li>Personal Branding and Online Presence</li>
      </ul>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Expert Instructors</h2>
      <p class="mb-4">Our workshops are led by industry experts with years of experience in career development, human resources, and professional coaching. You'll learn from professionals who have helped thousands of individuals advance their careers.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Interactive Learning</h2>
      <p class="mb-4">Each workshop includes hands-on activities, real-world case studies, and opportunities to practice new skills. You'll leave with actionable strategies you can implement immediately.</p>
      
      <h2 class="text-2xl font-bold mb-3 mt-6">Flexible Scheduling</h2>
      <p class="mb-4">We offer both in-person and virtual workshop options to accommodate different schedules and preferences. All workshops are recorded for participants who want to review the content later.</p>
      
      <p class="mb-4">Don't miss this opportunity to invest in your professional growth. Register today and take the next step in advancing your career!</p>
    `,
  },
];

const getNewsById = (id: number) => {
  return newsItems.find((item) => item.id === id);
};

export default function NewsDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const newsItem = id ? getNewsById(Number(id)) : undefined;

  if (!newsItem) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">News Article Not Found</h1>
          <Link href="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <article className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            {/* Hero Image */}
            <div className="relative h-96">
              <Image
                src={newsItem.image}
                alt={newsItem.title}
                fill
                className="object-cover"
              />
            </div>

            <div className="p-8 md:p-12">
              {/* Category and Date */}
              <div className="flex items-center gap-4 mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                  <Tag className="w-4 h-4" />
                  {newsItem.category}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(newsItem.date, "MMMM d, yyyy")}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                {newsItem.title}
              </h1>

              {/* Excerpt */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {newsItem.excerpt}
              </p>

              {/* Content */}
              <div
                className="prose prose-lg max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: newsItem.content }}
                style={{
                  lineHeight: "1.8",
                }}
              />
            </div>
          </motion.div>

          {/* Related News Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Related News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsItems
                .filter((item) => item.id !== newsItem.id)
                .slice(0, 2)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.id}`}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                  >
                    <div className="relative h-48">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        {format(item.date, "MMMM d, yyyy")}
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 line-clamp-2">{item.excerpt}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </motion.div>
        </article>
      </div>
    </div>
  );
}

