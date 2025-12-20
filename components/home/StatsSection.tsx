"use client";

import { motion } from "framer-motion";
import { Users, Globe, Handshake, Heart } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const stats = [
  {
    icon: Users,
    number: 111,
    suffix: "+",
    label: "Volunteer Staff",
  },
  {
    icon: Globe,
    number: 37,
    suffix: "+",
    label: "Countries Involved",
  },
  {
    icon: Handshake,
    number: 75,
    suffix: "+",
    label: "Collaborations & Partnerships",
  },
  {
    icon: Heart,
    number: 67000,
    suffix: "+",
    label: "People Impacted",
  },
];

export default function StatsSection() {
  const [counters, setCounters] = useState(stats.map(() => 0));
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            startCounterAnimation();
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of the section is visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [hasAnimated]);

  const startCounterAnimation = () => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = stats.map((stat) => stat.number / steps);
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setCounters((prev) =>
        prev.map((val, index) => {
          const target = stats[index].number;
          const inc = increment[index];
          const newVal = Math.min(val + inc, target);
          return newVal;
        })
      );

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounters(stats.map((stat) => stat.number));
      }
    }, duration / steps);
  };

  return (
    <section ref={sectionRef} className="relative min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892260/IMG_00521_kil1g0.jpg)",
          }}
        >
          {/* Overlay with website colors */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"></div>
        </div>
      </div>

      {/* Stats Content */}
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="mb-2">
                <span className="text-5xl md:text-6xl font-bold text-white">
                  {Math.floor(counters[index]).toLocaleString()}
                </span>
                <span className="text-5xl md:text-6xl font-bold text-white">{stat.suffix}</span>
              </div>
              <p className="text-white text-lg font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


