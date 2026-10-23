"use client";

import LegalAboutPage from "@/components/legal/LegalAboutPage";
import { writeCookieConsent } from "@/lib/cookie-consent";

export default function CookiesPage() {
  return (
    <LegalAboutPage
      title="COOKIE POLICY"
      introTitle="How we use cookies"
      intro={
        <p>Learn about how we use cookies to enhance your browsing experience and improve our services.</p>
      }
      storyKicker="Our Cookies"
      storyTitle={"Cookie\nPolicy"}
      contactIntro="If you have any questions about our use of cookies or this Cookie Policy, please contact us at:"
      blocks={[
        {
          title: "What Are Cookies?",
          paragraphs: [
            "Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.",
            "At Changer Fusions, we use cookies to improve your experience on our website, analyze site usage, and assist in our marketing efforts.",
          ],
        },
        {
          title: "Essential Cookies",
          paragraphs: [
            "These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website.",
            "Examples: Session management, Security, Load balancing",
          ],
        },
        {
          title: "Analytics Cookies",
          paragraphs: [
            "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
            "Examples: Page views, User behavior, Traffic sources",
          ],
        },
        {
          title: "Functional Cookies",
          paragraphs: [
            "These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.",
            "Examples: Language preferences, User preferences, Customization",
          ],
        },
        {
          title: "Advertising Cookies",
          paragraphs: [
            "These cookies help us and Google show and measure ads. They are set only after you choose Accept All. Decline keeps Google AdSense from loading.",
            "Examples: Google AdSense, Ad measurement, Personalized ads",
          ],
        },
        {
          title: "How We Use Cookies",
          items: [
            "To remember your preferences and settings",
            "To analyze website traffic and user behavior",
            "To improve website functionality and user experience",
            "To provide personalized content and advertisements",
            "To ensure website security and prevent fraud",
          ],
        },
        {
          title: "Managing Your Cookie Preferences",
          paragraphs: [
            "You have the right to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer.",
            "However, please note that disabling cookies may affect the functionality of our website and limit your ability to access certain features.",
            <>
              Use Accept All or Decline on the cookie banner. Accept All allows analytics and advertising cookies. Decline keeps Google AdSense and analytics from loading. Essential cookies still run so the site can work. You can make the same choice here:{" "}
              <button
                type="button"
                onClick={() => writeCookieConsent("accepted")}
                className="inline font-medium text-primary-700 underline"
              >
                Accept All
              </button>{" "}
              or{" "}
              <button
                type="button"
                onClick={() => writeCookieConsent("declined")}
                className="inline font-medium text-primary-700 underline"
              >
                Decline
              </button>
              . The choice is saved in this browser.
            </>,
          ],
        },
        {
          title: "Third-Party Cookies",
          paragraphs: [
            <>
              We use Google Analytics to understand how the site is used, and Google AdSense to show advertisements. Google and its partners may use cookies to serve ads based on your visits to this site and other sites. You can opt out of personalized advertising in{" "}
              <a
                href="https://adssettings.google.com"
                className="text-primary-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Ads Settings
              </a>
              , and you can read{" "}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                className="text-primary-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                how Google uses data from sites that use its services
              </a>
              . These third-party cookies are also covered by those providers&apos; own policies.
            </>,
          ],
        },
        {
          title: "Updates to This Policy",
          paragraphs: [
            "We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies.",
          ],
        },
      ]}
    />
  );
}
