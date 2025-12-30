"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Users, Award, Target, Lightbulb } from "lucide-react";

const teamMembers = [
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
];

export default function OurTeamPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Our Team
            </h1>
            <p className="text-lg text-gray-600">
              Meet the passionate professionals driving innovation and excellence at Changer Fusions
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="space-y-6"
              >
                {/* Image */}
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </motion.div>
            ))}

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {teamMembers[0].name}
                </h2>
                <p className="text-xl text-primary-600 font-semibold mb-6">
                  {teamMembers[0].position}
                </p>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  {teamMembers[0].description}
                </p>

                <div className="space-y-4">
                  {teamMembers[0].achievements.map((achievement, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                      className="flex items-start space-x-3"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{achievement}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Our Core Values
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide our team and shape our work
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "People-Centered",
                description: "We prioritize relationships and understand that success comes through collaboration.",
              },
              {
                icon: Target,
                title: "Results-Driven",
                description: "We focus on delivering measurable outcomes that exceed expectations.",
              },
              {
                icon: Lightbulb,
                title: "Innovation",
                description: "We embrace creativity and new approaches to solve complex challenges.",
              },
              {
                icon: Award,
                title: "Excellence",
                description: "We maintain the highest standards in every project we undertake.",
              },
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 text-center md:text-center lg:text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4 mx-auto md:mx-auto lg:mx-0">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

