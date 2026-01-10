"use client";

import { motion } from "framer-motion";

export default function ModelEventExperience() {
  // Extract video ID from YouTube URL
  const videoId = "GpbNlgVikiE";
  // Add autoplay, mute, and loop parameters for automatic playback
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;

  return (
    <section className="relative w-full h-screen bg-black overflow-hidden">
      {/* Title overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute top-8 left-0 right-0 z-10 text-center px-4"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-white drop-shadow-2xl">
          Our Model Event Experience
        </h2>
        <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-lg">
          Witness the excellence and professionalism we bring to every event
        </p>
      </motion.div>

      {/* Full screen video */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute inset-0 w-full h-full"
      >
        <iframe
          src={embedUrl}
          title="CMF Agency Model Event Experience"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
          style={{ border: "none" }}
        />
      </motion.div>
    </section>
  );
}
