"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, Search, DollarSign } from "lucide-react";
import Link from "next/link";

const jobs = [
  {
    id: 1,
    title: "Senior Marketing Manager",
    company: "Changer Fusions",
    location: "Remote / New York, NY",
    type: "Full-time",
    salary: "$80,000 - $120,000",
    posted: "2 days ago",
    description: "We're looking for an experienced marketing manager to lead our marketing initiatives.",
  },
  {
    id: 2,
    title: "Event Coordinator",
    company: "Changer Fusions",
    location: "Los Angeles, CA",
    type: "Full-time",
    salary: "$50,000 - $70,000",
    posted: "5 days ago",
    description: "Join our team to coordinate and manage exciting events for our clients.",
  },
  {
    id: 3,
    title: "Graphic Designer",
    company: "Changer Fusions",
    location: "Remote",
    type: "Part-time",
    salary: "$40,000 - $60,000",
    posted: "1 week ago",
    description: "Creative graphic designer needed for branding and design projects.",
  },
  {
    id: 4,
    title: "Web Developer",
    company: "Changer Fusions",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$90,000 - $130,000",
    posted: "3 days ago",
    description: "Full-stack developer to build and maintain our platform and client websites.",
  },
];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase())
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
              Job Board
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find exciting career opportunities with Changer Fusions and our partners
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </motion.div>

          {/* Jobs List */}
          <div className="space-y-6">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Briefcase className="w-5 h-5 text-primary-600" />
                      <h3 className="text-2xl font-bold text-gray-900">{job.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-primary-600" />
                        {job.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary-600" />
                        {job.type}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-primary-600" />
                        {job.salary}
                      </div>
                      <div className="text-gray-500">Posted {job.posted}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="btn-primary whitespace-nowrap"
                    >
                      View Details
                    </Link>
                    <button className="btn-outline whitespace-nowrap">
                      Apply Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No jobs found matching your search.</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

