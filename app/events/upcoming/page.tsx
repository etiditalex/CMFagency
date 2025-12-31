"use client";

import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import Image from "next/image";

export default function UpcomingEventsPage() {
  return (
    <div className="pt-20 min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154666/The_Kings_Experience_7_mpvtww.jpg"
          alt="Upcoming Events"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/70 via-secondary-800/60 to-primary-900/70"></div>
      </div>
      
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-20"
        >
          {/* Animated Coming Soon Text */}
          <div className="space-y-8 mb-12">
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-8xl lg:text-9xl font-bold"
            >
              <motion.span
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent"
                style={{
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  display: "inline-block",
                }}
              >
                Coming Soon
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl lg:text-3xl text-white/90 max-w-3xl mx-auto font-medium"
            >
              We're working on exciting upcoming events. Stay tuned for updates!
            </motion.p>
          </div>

          {/* Animated Icons */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex justify-center items-center space-x-8 mb-12"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg"
            >
              <Calendar className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </motion.div>

            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </motion.div>
          </motion.div>

          {/* Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex justify-center mt-8"
          >
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

