"use client";

import { notFound, useParams } from "next/navigation";
import { Briefcase, MapPin, Clock, DollarSign, Calendar, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const jobs = [
  {
    id: 1,
    title: "Senior Marketing Manager",
    company: "Changer Fusions Enterprises",
    location: "Remote / New York, NY",
    type: "Full-time",
    salary: "$80,000 - $120,000",
    posted: "2 days ago",
    description: "We're looking for an experienced marketing manager to lead our marketing initiatives.",
    fullDescription: `We are seeking a highly experienced and strategic Senior Marketing Manager to lead our marketing initiatives and drive business growth. The ideal candidate will have a proven track record in developing and executing comprehensive marketing strategies across multiple channels.

## Key Responsibilities:
- Develop and implement comprehensive marketing strategies aligned with business objectives
- Lead and manage the marketing team, fostering a collaborative and high-performance culture
- Oversee all marketing campaigns, from conception to execution and analysis
- Manage marketing budgets and ensure optimal ROI on all marketing spend
- Conduct market research and competitor analysis to identify opportunities
- Build and maintain strong relationships with key stakeholders and partners
- Analyze marketing metrics and provide regular reports to senior management
- Stay current with marketing trends and best practices

## Requirements:
- Bachelor's degree in Marketing, Business, or related field
- 7+ years of experience in marketing, with at least 3 years in a management role
- Strong leadership and team management skills
- Excellent communication and presentation skills
- Proven ability to develop and execute successful marketing campaigns
- Experience with digital marketing tools and platforms
- Strong analytical skills and data-driven decision making
- Ability to work in a fast-paced, dynamic environment`,
    requirements: [
      "Bachelor's degree in Marketing, Business, or related field",
      "7+ years of experience in marketing",
      "Strong leadership and team management skills",
      "Experience with digital marketing tools",
      "Excellent communication skills",
    ],
    benefits: [
      "Competitive salary and benefits package",
      "Flexible work arrangements",
      "Professional development opportunities",
      "Health and dental insurance",
      "401(k) retirement plan",
    ],
  },
  {
    id: 2,
    title: "Event Coordinator",
    company: "Changer Fusions Enterprises",
    location: "Los Angeles, CA",
    type: "Full-time",
    salary: "$50,000 - $70,000",
    posted: "5 days ago",
    description: "Join our team to coordinate and manage exciting events for our clients.",
    fullDescription: `We are looking for a dynamic and organized Event Coordinator to join our team and help coordinate and manage exciting events for our clients. This role requires excellent organizational skills, attention to detail, and the ability to work under pressure.

## Key Responsibilities:
- Plan and coordinate events from conception to completion
- Manage event budgets and ensure cost-effectiveness
- Coordinate with vendors, venues, and suppliers
- Handle event registration and attendee management
- Create and manage event timelines and schedules
- Oversee event setup, execution, and breakdown
- Manage event marketing and promotion activities
- Collect and analyze event feedback and metrics
- Maintain relationships with clients and stakeholders

## Requirements:
- Bachelor's degree in Event Management, Hospitality, or related field
- 3+ years of experience in event planning and coordination
- Strong organizational and project management skills
- Excellent communication and interpersonal skills
- Ability to work flexible hours, including evenings and weekends
- Proficiency in event management software
- Detail-oriented with strong problem-solving abilities`,
    requirements: [
      "Bachelor's degree in Event Management or related field",
      "3+ years of event planning experience",
      "Strong organizational skills",
      "Ability to work flexible hours",
      "Excellent communication skills",
    ],
    benefits: [
      "Competitive salary",
      "Health insurance",
      "Paid time off",
      "Professional development support",
      "Flexible schedule",
    ],
  },
  {
    id: 3,
    title: "Graphic Designer",
    company: "Changer Fusions Enterprises",
    location: "Remote",
    type: "Part-time",
    salary: "$40,000 - $60,000",
    posted: "1 week ago",
    description: "Creative graphic designer needed for branding and design projects.",
    fullDescription: `We are seeking a talented and creative Graphic Designer to join our team on a part-time basis. You will work on various branding and design projects, creating visually compelling materials that align with our clients' brand identities.

## Key Responsibilities:
- Create visual concepts and designs for various marketing materials
- Develop brand identities, logos, and visual guidelines
- Design print and digital materials including brochures, flyers, and social media graphics
- Collaborate with the marketing team to ensure brand consistency
- Present design concepts and incorporate feedback
- Manage multiple design projects simultaneously
- Stay current with design trends and best practices
- Work with clients to understand their design needs and preferences

## Requirements:
- Bachelor's degree in Graphic Design, Visual Arts, or related field
- 3+ years of professional graphic design experience
- Proficiency in Adobe Creative Suite (Photoshop, Illustrator, InDesign)
- Strong portfolio demonstrating creative and technical skills
- Excellent attention to detail
- Ability to work independently and meet deadlines
- Strong communication and collaboration skills`,
    requirements: [
      "Bachelor's degree in Graphic Design or related field",
      "3+ years of professional design experience",
      "Proficiency in Adobe Creative Suite",
      "Strong portfolio",
      "Excellent attention to detail",
    ],
    benefits: [
      "Flexible work schedule",
      "Remote work opportunity",
      "Creative freedom",
      "Competitive hourly rate",
      "Portfolio building opportunities",
    ],
  },
  {
    id: 4,
    title: "Web Developer",
    company: "Changer Fusions Enterprises",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$90,000 - $130,000",
    posted: "3 days ago",
    description: "Full-stack developer to build and maintain our platform and client websites.",
    fullDescription: `We are looking for an experienced Full-Stack Web Developer to build and maintain our platform and client websites. You will work on both front-end and back-end development, creating responsive and user-friendly web applications.

## Key Responsibilities:
- Develop and maintain web applications using modern frameworks and technologies
- Write clean, efficient, and well-documented code
- Collaborate with designers to implement responsive and visually appealing interfaces
- Build and maintain APIs and database systems
- Optimize applications for maximum speed and scalability
- Troubleshoot and debug applications
- Stay current with web development trends and best practices
- Participate in code reviews and team meetings

## Requirements:
- Bachelor's degree in Computer Science, Web Development, or related field
- 5+ years of experience in full-stack web development
- Proficiency in JavaScript, HTML, CSS, and modern frameworks (React, Next.js, Node.js)
- Experience with database systems (SQL, MongoDB)
- Strong problem-solving and debugging skills
- Excellent collaboration and communication skills
- Portfolio of web development projects`,
    requirements: [
      "Bachelor's degree in Computer Science or related field",
      "5+ years of full-stack development experience",
      "Proficiency in JavaScript, React, Node.js",
      "Experience with databases",
      "Strong problem-solving skills",
    ],
    benefits: [
      "Competitive salary and equity",
      "Health, dental, and vision insurance",
      "401(k) with company match",
      "Flexible work arrangements",
      "Professional development budget",
      "Stock options",
    ],
  },
];

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const jobId = parseInt(id);
  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    notFound();
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </Link>
          </motion.div>

          {/* Job Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{job.title}</h1>
            </div>
            <p className="text-xl text-gray-600 mb-6">{job.company}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-2 text-primary-600" />
                <span>{job.type}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-5 h-5 mr-2 text-primary-600" />
                <span>{job.salary}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                <span>Posted {job.posted}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href={`mailto:info@cmfagency.co.ke?subject=Application for ${job.title}`}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Mail className="w-5 h-5" />
                <span>Apply Now</span>
              </a>
            </div>
          </motion.div>

          {/* Job Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-line">
              {job.fullDescription}
            </div>
          </motion.div>

          {/* Requirements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
            <ul className="space-y-3">
              {job.requirements.map((req, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="text-primary-600 mt-1">•</span>
                  <span className="text-gray-700">{req}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Benefits</h2>
            <ul className="space-y-3">
              {job.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="text-primary-600 mt-1">•</span>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Apply CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl shadow-lg p-8 text-white text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Apply?</h2>
            <p className="text-xl text-white/90 mb-6">
              Send us your resume and cover letter to get started.
            </p>
            <a
              href={`mailto:info@cmfagency.co.ke?subject=Application for ${job.title}`}
              className="inline-flex items-center space-x-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Mail className="w-5 h-5" />
              <span>Apply Now</span>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

