import LegalAboutPage from "@/components/legal/LegalAboutPage";

export default function TermsPage() {
  return (
    <LegalAboutPage
      title="TERMS AND CONDITIONS"
      introTitle="Please read carefully"
      intro={
        <p>Please read these terms and conditions carefully before using our website and services.</p>
      }
      storyKicker="Our Terms"
      storyTitle={"These\nTerms"}
      contactIntro="If you have any questions about these Terms and Conditions, please contact us:"
      blocks={[
        {
          title: "Introduction",
          paragraphs: [
            'Welcome to Changer Fusions. These Terms and Conditions ("Terms") govern your access to and use of our website, services, and any related applications (collectively, the "Service").',
            "By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, then you may not access the Service.",
          ],
        },
        {
          title: "Acceptance of Terms",
          paragraphs: [
            "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.",
          ],
        },
        {
          title: "Use License",
          paragraphs: [
            "Permission is granted to temporarily download one copy of the materials on Changer Fusions' website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose or for any public display; attempt to decompile or reverse engineer any software; remove any copyright or other proprietary notations from the materials.",
          ],
        },
        {
          title: "Disclaimer",
          paragraphs: [
            "The materials on Changer Fusions' website are provided on an 'as is' basis. Changer Fusions makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
          ],
        },
        {
          title: "Limitations",
          paragraphs: [
            "In no event shall Changer Fusions or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Changer Fusions' website, even if Changer Fusions or a Changer Fusions authorized representative has been notified orally or in writing of the possibility of such damage.",
          ],
        },
        {
          title: "Event Registration and Tickets",
          items: [
            "Event tickets are non-refundable unless otherwise stated",
            "You must be 18 years or older to register for events",
            "We reserve the right to refuse service or admission to any event",
            "Event dates, times, and locations are subject to change",
            "Photography and videography may occur at events",
          ],
        },
        {
          title: "Payment Terms",
          items: [
            "All prices are in Kenyan Shillings (KES) unless otherwise stated",
            "Payment must be made in full at the time of purchase",
            "We accept various payment methods including credit cards and mobile money",
            "Refunds are processed according to our refund policy",
            "We reserve the right to change prices at any time",
          ],
        },
        {
          title: "Intellectual Property",
          paragraphs: [
            "The Service and its original content, features, and functionality are and will remain the exclusive property of Changer Fusions and its licensors. The Service is protected by copyright, trademark, and other laws.",
            "You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website without our prior written consent.",
          ],
        },
        {
          title: "User Accounts",
          items: [
            "You are responsible for maintaining the confidentiality of your account credentials",
            "You agree to provide accurate and complete information when creating an account",
            "You are responsible for all activities that occur under your account",
            "You must notify us immediately of any unauthorized use of your account",
            "We reserve the right to suspend or terminate accounts that violate these Terms",
          ],
        },
        {
          title: "Prohibited Uses",
          paragraphs: ["You may not use our Service:"],
          items: [
            "In any way that violates any applicable law or regulation",
            "To transmit any malicious code or viruses",
            "To impersonate or attempt to impersonate another person or entity",
            "To engage in any automated use of the system",
            "To interfere with or disrupt the Service or servers",
          ],
        },
        {
          title: "Modifications to Terms",
          paragraphs: [
            "We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.",
          ],
        },
        {
          title: "Governing Law",
          paragraphs: [
            "These Terms shall be governed and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Kenya.",
          ],
        },
      ]}
    />
  );
}
