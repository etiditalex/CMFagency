"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, User, Briefcase, MapPin, Star, Linkedin, Mail } from "lucide-react";
import Image from "next/image";

const talents = [
  {
    id: 1,
    name: "Model 1",
    role: "Professional Model",
    location: "Nairobi, Kenya",
    experience: "5+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    skills: ["Fashion Modeling", "Runway", "Photography"],
    rating: 4.9,
    projects: 45,
    bio: "Experienced professional model with expertise in fashion, commercial, and editorial photography.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
  {
    id: 2,
    name: "Model 2",
    role: "Professional Model",
    location: "Mombasa, Kenya",
    experience: "4+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    skills: ["Fashion Modeling", "Commercial", "Brand Ambassador"],
    rating: 4.8,
    projects: 38,
    bio: "Versatile model specializing in fashion shows, commercial campaigns, and brand representation.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
  {
    id: 3,
    name: "Model 3",
    role: "Professional Model",
    location: "Nairobi, Kenya",
    experience: "6+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    skills: ["Editorial", "Fashion", "Event Modeling"],
    rating: 4.9,
    projects: 52,
    bio: "Professional model with extensive experience in editorial shoots, fashion shows, and special events.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
  {
    id: 4,
    name: "Model 4",
    role: "Professional Model",
    location: "Kisumu, Kenya",
    experience: "5+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
    skills: ["Runway", "Photography", "Commercial"],
    rating: 4.7,
    projects: 60,
    bio: "Talented model known for dynamic runway presence and versatility in various modeling genres.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
  {
    id: 5,
    name: "Model 5",
    role: "Professional Model",
    location: "Mombasa, Kenya",
    experience: "4+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892257/IMG_0340_alj30p.jpg",
    skills: ["Fashion", "Editorial", "Brand Modeling"],
    rating: 4.8,
    projects: 42,
    bio: "Professional model specializing in fashion photography, editorial work, and brand campaigns.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
  {
    id: 6,
    name: "Model 6",
    role: "Professional Model",
    location: "Nairobi, Kenya",
    experience: "6+ years",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9855_tpqcuh.jpg",
    skills: ["Commercial", "Fashion", "Event Modeling"],
    rating: 4.9,
    projects: 35,
    bio: "Experienced professional model with expertise in commercial campaigns, fashion shows, and special events.",
    linkedin: "#",
    email: "info@cmfagency.co.ke",
  },
];

const categories = ["All", "Marketing", "Design", "Development", "Content", "Events"];

export default function TalentShowcasePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTalents = talents.filter((talent) => {
    const matchesCategory = selectedCategory === "All" || talent.skills.some((skill) => skill.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesSearch =
      talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      talent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      talent.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Talent Showcase
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover talented professionals ready to bring your projects to life
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search talents by name, role, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-primary-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Talents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTalents.map((talent, index) => (
              <motion.div
                key={talent.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="relative h-64 bg-gradient-to-br from-primary-100 to-secondary-100 overflow-hidden">
                  <Image
                    src={talent.image}
                    alt={talent.name}
                    fill
                    className="object-contain object-top"
                    style={{ objectPosition: 'top center' }}
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold">{talent.rating}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-1 text-gray-900">{talent.name}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span>{talent.role}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{talent.location}</span>
                    <span className="mx-2">•</span>
                    <span>{talent.experience}</span>
                  </div>
                  <p className="text-gray-700 mb-4 text-sm line-clamp-2">{talent.bio}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {talent.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{talent.projects}</span> projects
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={talent.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label="LinkedIn"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a
                        href={`mailto:${talent.email}`}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label="Email"
                      >
                        <Mail className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredTalents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No talents found matching your criteria.</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

