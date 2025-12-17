"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

const getPortfolioById = (id: number) => {
  const portfolios = [
    {
      id: 1,
      title: "TechCorp Brand Identity",
      category: "Branding",
      client: "TechCorp Inc.",
      date: "2024",
      image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9818_z7o3uu.jpg",
      description: "Complete brand identity redesign for a leading tech company.",
      longDescription: "We worked closely with TechCorp to create a modern, innovative brand identity that reflects their position as a technology leader. The project included logo design, color palette development, typography selection, and comprehensive brand guidelines.",
      tags: ["Branding", "Logo Design", "Identity", "Corporate"],
      images: [
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9818_z7o3uu.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892260/IMG_0407_vmrpxn.jpg",
        "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892252/IMG_0314_hxbjtk.jpg",
      ],
      deliverables: [
        "Logo Design",
        "Brand Guidelines",
        "Color Palette",
        "Typography System",
        "Business Cards",
        "Letterhead Design",
      ],
      challenge: "TechCorp needed a brand refresh that would appeal to both enterprise clients and tech-savvy consumers while maintaining their professional reputation.",
      solution: "We developed a bold, modern identity system that combines clean geometric shapes with vibrant colors, creating a distinctive look that stands out in the competitive tech market.",
    },
  ];
  return portfolios.find((p) => p.id === id);
};

export default function PortfolioDetailPage() {
  const params = useParams();
  const portfolio = getPortfolioById(Number(params.id));

  if (!portfolio) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Portfolio Not Found</h1>
          <Link href="/portfolios" className="btn-primary">
            Back to Portfolios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/portfolios"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portfolios
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
        >
          <div className="relative h-96">
            <Image
              src={portfolio.image}
              alt={portfolio.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-8 md:p-12">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                {portfolio.category}
              </span>
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span>{portfolio.client}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{portfolio.date}</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              {portfolio.title}
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {portfolio.longDescription || portfolio.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {portfolio.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center"
                >
                  <Tag className="w-3 h-3 mr-2" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Challenge & Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-primary-50 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-gray-900">Challenge</h3>
                <p className="text-gray-700">{portfolio.challenge}</p>
              </div>
              <div className="p-6 bg-secondary-50 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-gray-900">Solution</h3>
                <p className="text-gray-700">{portfolio.solution}</p>
              </div>
            </div>

            {/* Deliverables */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Deliverables</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio.deliverables.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg text-center font-medium text-gray-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Project Gallery</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.images.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    <Image
                      src={img}
                      alt={`${portfolio.title} - Image ${index + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

