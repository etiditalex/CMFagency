import LegalAboutPage from "@/components/legal/LegalAboutPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalAboutPage
      title="PRIVACY POLICY"
      introTitle="Your privacy matters"
      intro={
        <p>Your privacy is important to us. Learn how we collect, use, and protect your personal information.</p>
      }
      storyKicker="Our Policy"
      storyTitle={"Your\nPrivacy"}
      contactIntro="If you have any questions about this Privacy Policy or our data practices, please contact us:"
      blocks={[
        {
          title: "Introduction",
          paragraphs: [
            'Changer Fusions ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.',
            "By using our website and services, you consent to the collection and use of information in accordance with this policy.",
          ],
        },
        {
          title: "Information We Collect",
          items: [
            "Personal information (name, email, phone number) when you register or contact us",
            "Payment information when you make purchases",
            "Usage data and analytics when you browse our website",
            "Event registration and attendance information",
            "Communication preferences and feedback",
          ],
        },
        {
          title: "How We Use Your Information",
          items: [
            "To provide and improve our services",
            "To process transactions and send confirmations",
            "To communicate with you about events, services, and updates",
            "To personalize your experience",
            "To analyze website usage and improve functionality",
            "To show and measure advertisements, including ads from Google AdSense, when you allow advertising cookies",
            "To comply with legal obligations",
          ],
        },
        {
          title: "Data Security",
          items: [
            "We implement appropriate technical and organizational measures to protect your personal information",
            "We use encryption and secure servers to safeguard data",
            "Access to personal information is restricted to authorized personnel only",
            "We regularly review and update our security practices",
          ],
        },
        {
          title: "Your Rights",
          items: [
            "Right to access your personal information",
            "Right to correct inaccurate data",
            "Right to request deletion of your data",
            "Right to object to processing of your data",
            "Right to data portability",
            "Right to withdraw consent at any time",
          ],
        },
        {
          title: "Data Sharing and Disclosure",
          paragraphs: [
            "We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:",
          ],
          items: [
            "With service providers who assist us in operating our website and conducting our business, including Google when you allow analytics or advertising cookies",
            "When required by law or to protect our rights and safety",
            "In connection with a business transfer or merger",
            "With your explicit consent",
          ],
        },
        {
          title: "Advertising and Cookies",
          paragraphs: [
            "We use cookies and similar technologies. Essential cookies keep the site working. Analytics and advertising cookies run only if you choose Accept All on the cookie banner. Decline keeps those cookies off.",
            "Third-party vendors, including Google, use cookies to serve ads based on your visits to this website and other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and other sites on the Internet.",
            <>
              You can opt out of personalized advertising by visiting{" "}
              <a
                href="https://adssettings.google.com"
                className="text-primary-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Ads Settings
              </a>
              . To learn how Google uses data from partner sites, read{" "}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                className="text-primary-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                How Google uses information from sites or apps that use our services
              </a>
              .
            </>,
            <>
              More detail is in our{" "}
              <a href="/cookies" className="text-primary-700 underline">
                Cookie Policy
              </a>
              .
            </>,
          ],
        },
        {
          title: "Data Retention",
          paragraphs: [
            "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.",
          ],
        },
        {
          title: "Children's Privacy",
          paragraphs: [
            "Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.",
          ],
        },
        {
          title: "International Data Transfers",
          paragraphs: [
            "Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our services, you consent to the transfer of your information.",
          ],
        },
        {
          title: "Changes to This Privacy Policy",
          paragraphs: [
            'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.',
          ],
        },
      ]}
    />
  );
}
