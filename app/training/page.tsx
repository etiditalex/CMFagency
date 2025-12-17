"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Award, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

const trainingPrograms = [
  {
    id: 1,
    title: "Digital Marketing Fundamentals",
    description: "Master the essentials of digital marketing including SEO, social media, email marketing, and content strategy.",
    duration: "6 weeks",
    level: "Beginner",
    participants: 120,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
    modules: [
      "Introduction to Digital Marketing",
      "SEO & Content Marketing",
      "Social Media Strategy",
      "Email Marketing Campaigns",
      "Analytics & Measurement",
      "Marketing Automation",
    ],
    instructor: "Sarah Johnson",
    price: "KSh 25,000",
    nextStartDate: "2024-12-15",
  },
  {
    id: 2,
    title: "Web Development Bootcamp",
    description: "Comprehensive web development course covering HTML, CSS, JavaScript, React, and Next.js.",
    duration: "12 weeks",
    level: "Intermediate",
    participants: 85,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    modules: [
      "HTML & CSS Fundamentals",
      "JavaScript Essentials",
      "React Framework",
      "Next.js & Server-Side Rendering",
      "Database Integration",
      "Deployment & DevOps",
    ],
    instructor: "Michael Chen",
    price: "KSh 45,000",
    nextStartDate: "2025-01-10",
  },
  {
    id: 3,
    title: "Event Planning & Management",
    description: "Learn professional event planning skills from concept to execution, including vendor management and logistics.",
    duration: "8 weeks",
    level: "Beginner",
    participants: 95,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    modules: [
      "Event Planning Fundamentals",
      "Budgeting & Financial Management",
      "Vendor Selection & Negotiation",
      "Marketing & Promotion",
      "Day-of Event Coordination",
      "Post-Event Analysis",
    ],
    instructor: "Emily Rodriguez",
    price: "KSh 30,000",
    nextStartDate: "2024-12-20",
  },
  {
    id: 4,
    title: "Graphic Design Mastery",
    description: "Advanced graphic design techniques using industry-standard tools and design principles.",
    duration: "10 weeks",
    level: "Intermediate",
    participants: 70,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    modules: [
      "Design Principles & Theory",
      "Adobe Creative Suite",
      "Brand Identity Design",
      "Print & Digital Design",
      "Typography & Layout",
      "Portfolio Development",
    ],
    instructor: "David Ochieng",
    price: "KSh 35,000",
    nextStartDate: "2025-01-05",
  },
  {
    id: 5,
    title: "Content Writing & Strategy",
    description: "Develop compelling content that engages audiences and drives business results.",
    duration: "6 weeks",
    level: "Beginner",
    participants: 110,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    modules: [
      "Writing Fundamentals",
      "SEO Content Writing",
      "Social Media Content",
      "Blog & Article Writing",
      "Copywriting for Marketing",
      "Content Strategy & Planning",
    ],
    instructor: "Amina Hassan",
    price: "KSh 22,000",
    nextStartDate: "2024-12-18",
  },
  {
    id: 6,
    title: "Video Production & Editing",
    description: "Professional video production and editing skills for commercial and social media content.",
    duration: "8 weeks",
    level: "Intermediate",
    participants: 60,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    modules: [
      "Video Production Basics",
      "Camera Techniques & Lighting",
      "Audio Recording & Mixing",
      "Video Editing with Premiere Pro",
      "Motion Graphics & Animation",
      "Distribution & Marketing",
    ],
    instructor: "James Kariuki",
    price: "KSh 40,000",
    nextStartDate: "2025-01-15",
  },
];

export default function TrainingProgramsPage() {
  const [selectedLevel, setSelectedLevel] = useState("All");

  const filteredPrograms = trainingPrograms.filter(
    (program) => selectedLevel === "All" || program.level === selectedLevel
  );

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
              Training Programs
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enhance your skills with our comprehensive training programs designed for professionals at all levels
            </p>
          </motion.div>

          {/* Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 flex justify-center gap-2"
          >
            {["All", "Beginner", "Intermediate", "Advanced"].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  selectedLevel === level
                    ? "bg-primary-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {level}
              </button>
            ))}
          </motion.div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="relative h-48">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {program.level}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 text-gray-900">{program.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{program.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-primary-600" />
                      <span>{program.duration}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2 text-primary-600" />
                      <span>{program.participants} enrolled</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-primary-600" />
                      <span>Starts: {format(new Date(program.nextStartDate), "MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Award className="w-4 h-4 mr-2 text-primary-600" />
                      <span>Instructor: {program.instructor}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Course Modules:</p>
                    <ul className="space-y-1">
                      {program.modules.slice(0, 3).map((module, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 mr-2 text-primary-600" />
                          {module}
                        </li>
                      ))}
                      <li className="text-sm text-primary-600 font-medium">
                        +{program.modules.length - 3} more modules
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-2xl font-bold text-primary-600">{program.price}</span>
                    </div>
                    <Link
                      href={`/training/${program.id}`}
                      className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredPrograms.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No training programs found matching your criteria.</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

