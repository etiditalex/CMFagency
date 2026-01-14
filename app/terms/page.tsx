"use client";

import { motion } from "framer-motion";
import { FileText, Scale, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";

export default function TermsPage() {
  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      content: "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.",
    },
    {
      icon: Scale,
      title: "Use License",
      content: "Permission is granted to temporarily download one copy of the materials on Changer Fusions' website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose or for any public display; attempt to decompile or reverse engineer any software; remove any copyright or other proprietary notations from the materials.",
    },
    {
      icon: AlertCircle,
      title: "Disclaimer",
      content: "The materials on Changer Fusions' website are provided on an 'as is' basis. Changer Fusions makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
    },
    {
      icon: CheckCircle,
      title: "Limitations",
      content: "In no event shall Changer Fusions or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Changer Fusions' website, even if Changer Fusions or a Changer Fusions authorized representative has been notified orally or in writing of the possibility of such damage.",
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[300px] md:min-h-[400px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg"
            alt="Terms and Conditions"
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
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Terms and Conditions</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Please read these terms and conditions carefully before using our website and services.
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
                Welcome to Changer Fusions. These Terms and Conditions ("Terms") govern your access to and use of our website, services, and any related applications (collectively, the "Service").
              </p>
              <p className="text-gray-700 leading-relaxed">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, then you may not access the Service.
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
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <section.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">{section.title}</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed ml-16">{section.content}</p>
                </div>
              </motion.div>
            ))}

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Event Registration and Tickets</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>Event tickets are non-refundable unless otherwise stated</li>
                <li>You must be 18 years or older to register for events</li>
                <li>We reserve the right to refuse service or admission to any event</li>
                <li>Event dates, times, and locations are subject to change</li>
                <li>Photography and videography may occur at events</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Terms</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>All prices are in Kenyan Shillings (KES) unless otherwise stated</li>
                <li>Payment must be made in full at the time of purchase</li>
                <li>We accept various payment methods including credit cards and mobile money</li>
                <li>Refunds are processed according to our refund policy</li>
                <li>We reserve the right to change prices at any time</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive property of Changer Fusions and its licensors. The Service is protected by copyright, trademark, and other laws.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website without our prior written consent.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">User Accounts</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You agree to provide accurate and complete information when creating an account</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You may not use our Service:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
                <li>In any way that violates any applicable law or regulation</li>
                <li>To transmit any malicious code or viruses</li>
                <li>To impersonate or attempt to impersonate another person or entity</li>
                <li>To engage in any automated use of the system</li>
                <li>To interfere with or disrupt the Service or servers</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Modifications to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Kenya.
              </p>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
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

