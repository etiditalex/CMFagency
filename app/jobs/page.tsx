"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function JobsPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date("2026-01-08T23:59:59").getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);
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

          {/* Advertisement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="flex flex-col md:flex-row">
              {/* Image Section */}
              <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-[400px] bg-gray-100 flex items-center justify-center">
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767691548/opportunity_dzeqxh.jpg"
                  alt="Career Opportunity Advertisement"
                  width={800}
                  height={600}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              {/* Content Section */}
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Career Opportunities
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-primary-600 flex-shrink-0" />
                    <span>Mombasa</span>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Explore exciting career opportunities with Changer Fusions. Join our team and be part of creating impactful experiences and innovative solutions.
                </p>
                
                {/* Countdown Timer */}
                <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex items-center mb-3">
                    <Clock className="w-5 h-5 text-primary-600 mr-2" />
                    <span className="text-sm font-semibold text-primary-700">Application Deadline</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {timeLeft.days}
                      </div>
                      <div className="text-xs text-gray-600">Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {timeLeft.hours}
                      </div>
                      <div className="text-xs text-gray-600">Hours</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {timeLeft.minutes}
                      </div>
                      <div className="text-xs text-gray-600">Minutes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {timeLeft.seconds}
                      </div>
                      <div className="text-xs text-gray-600">Seconds</div>
                    </div>
                  </div>
                </div>

                <Link
                  href="/jobs/apply"
                  className="inline-block mt-4 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200 text-center"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}

