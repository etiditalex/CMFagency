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
];

export default function OurTeamPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg"
            alt="Our Team"
            fill
            className="object-cover object-top"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/50 via-secondary-800/40 to-primary-900/50"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Our Team
            </h1>
            <p className="text-lg text-white/90">
              Meet the passionate professionals driving innovation and excellence at Changer Fusions
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="space-y-24">
            {/* CEO Section - Full Width */}
            {teamMembers[0] && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Image */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
                    <Image
                      src={teamMembers[0].image}
                      alt={teamMembers[0].name}
                      fill
                      className="object-cover object-top"
                      priority
                    />
                  </div>
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
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
            )}

            {/* Other Team Members - Grid Layout */}
            {teamMembers.length > 1 && (
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Our Team
                  </h2>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                  {teamMembers.slice(1).map((member, memberIndex) => (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: (memberIndex + 1) * 0.2 }}
                      className="group relative"
                    >
                      {/* Card Container */}
                      <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-white">
                        {/* Image */}
                        <div className="relative w-full h-full">
                          <Image
                            src={member.image}
                            alt={member.name}
                            fill
                            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Overlay with Content - Shows on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                              {member.name}
                            </h3>
                            <p className="text-lg text-primary-300 font-semibold mb-4">
                              {member.position}
                            </p>
                            <p className="text-white/90 text-sm leading-relaxed mb-4 line-clamp-3">
                              {member.description}
                            </p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {member.achievements.map((achievement, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start space-x-2"
                                >
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                                  </div>
                                  <p className="text-white/80 text-xs leading-relaxed">{achievement}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Always Visible Name and Position */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent group-hover:opacity-0 transition-opacity duration-300">
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                            {member.name}
                          </h3>
                          <p className="text-primary-300 font-semibold text-sm">
                            {member.position}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
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

