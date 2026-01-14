"use client";

import { motion } from "framer-motion";
import { Cookie, Shield, BarChart, Settings } from "lucide-react";
import Image from "next/image";

export default function CookiesPage() {
  const cookieTypes = [
    {
      icon: Settings,
      title: "Essential Cookies",
      description: "These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website.",
      examples: ["Session management", "Security", "Load balancing"],
    },
    {
      icon: BarChart,
      title: "Analytics Cookies",
      description: "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
      examples: ["Page views", "User behavior", "Traffic sources"],
    },
    {
      icon: Shield,
      title: "Functional Cookies",
      description: "These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.",
      examples: ["Language preferences", "User preferences", "Customization"],
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[300px] md:min-h-[400px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154666/The_Kings_Experience_5_ipmrbq.jpg"
            alt="Cookie Policy"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
              <Cookie className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Cookie Policy</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Learn about how we use cookies to enhance your browsing experience and improve our services.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="prose prose-lg max-w-none"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.
              </p>
              <p className="text-gray-700 leading-relaxed">
                At Changer Fusions, we use cookies to improve your experience on our website, analyze site usage, and assist in our marketing efforts.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Types of Cookies We Use</h2>
              <div className="space-y-6">
                {cookieTypes.map((type, index) => (
                  <motion.div
                    key={type.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-gray-50 rounded-xl p-6"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <type.icon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{type.title}</h3>
                        <p className="text-gray-700 leading-relaxed mb-3">{type.description}</p>
                        <div className="text-sm text-gray-600">
                          <strong>Examples:</strong> {type.examples.join(", ")}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How We Use Cookies</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>To remember your preferences and settings</li>
                <li>To analyze website traffic and user behavior</li>
                <li>To improve website functionality and user experience</li>
                <li>To provide personalized content and advertisements</li>
                <li>To ensure website security and prevent fraud</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                However, please note that disabling cookies may affect the functionality of our website and limit your ability to access certain features.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You can manage your cookie preferences at any time by clicking on the cookie settings link in our cookie banner or by adjusting your browser settings.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the website, deliver advertisements, and so on. These third-party cookies are governed by the respective privacy policies of those third parties.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies.
              </p>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Email:</strong> info@cmfagency.co.ke<br />
                <strong>Phone:</strong> +254 797 777347<br />
                <strong>Address:</strong> AMBALAL BUILDING, NKRUMA ROAD, MOMBASA, KENYA
              </p>
            </div>

            <div className="mt-8 text-sm text-gray-500">
              <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

