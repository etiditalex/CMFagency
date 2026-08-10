"use client";

import { motion } from "framer-motion";
import { Users, Globe, Handshake, Heart } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

const STATS_BG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892260/IMG_00521_kil1g0.jpg";

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
    <section
      ref={sectionRef}
      className="relative flex min-h-[360px] items-center justify-center overflow-hidden py-10 sm:min-h-[420px] sm:py-12 md:min-h-[480px] md:py-16"
    >
      <div className="absolute inset-0 z-0">
        <Image
          src={STATS_BG_IMAGE}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"
          aria-hidden
        />
      </div>

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm sm:mb-4 sm:h-16 sm:w-16">
                <stat.icon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
              </div>
              <div className="mb-1 text-center sm:mb-2">
                <span className="text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:text-6xl">
                  {Math.floor(counters[index]).toLocaleString()}
                </span>
                <span className="text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:text-6xl">
                  {stat.suffix}
                </span>
              </div>
              <p className="text-center text-sm font-medium text-white sm:text-base md:text-lg">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}





