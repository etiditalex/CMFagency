"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText } from "lucide-react";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: FileText,
      title: "Information We Collect",
      content: [
        "Personal information (name, email, phone number) when you register or contact us",
        "Payment information when you make purchases",
        "Usage data and analytics when you browse our website",
        "Event registration and attendance information",
        "Communication preferences and feedback",
      ],
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        "To provide and improve our services",
        "To process transactions and send confirmations",
        "To communicate with you about events, services, and updates",
        "To personalize your experience",
        "To analyze website usage and improve functionality",
        "To comply with legal obligations",
      ],
    },
    {
      icon: Lock,
      title: "Data Security",
      content: [
        "We implement appropriate technical and organizational measures to protect your personal information",
        "We use encryption and secure servers to safeguard data",
        "Access to personal information is restricted to authorized personnel only",
        "We regularly review and update our security practices",
      ],
    },
    {
      icon: Shield,
      title: "Your Rights",
      content: [
        "Right to access your personal information",
        "Right to correct inaccurate data",
        "Right to request deletion of your data",
        "Right to object to processing of your data",
        "Right to data portability",
        "Right to withdraw consent at any time",
      ],
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[300px] md:min-h-[400px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_4_rcq1m6.jpg"
            alt="Privacy Policy"
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
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Changer Fusions ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>
              <p className="text-gray-700 leading-relaxed">
                By using our website and services, you consent to the collection and use of information in accordance with this policy.
              </p>
            </div>

            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="mb-8"
              >
                <div className="bg-gray-50 rounded-xl p-6 mb-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <section.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">{section.title}</h2>
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed ml-16">
                    {section.content.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>With service providers who assist us in operating our website and conducting our business</li>
                <li>When required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer or merger</li>
                <li>With your explicit consent</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our services, you consent to the transfer of your information.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
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

