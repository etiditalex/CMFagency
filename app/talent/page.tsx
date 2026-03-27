import Link from "next/link";
import Image from "next/image";

export default function TalentPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="relative section-padding overflow-hidden min-h-[280px] md:min-h-[360px] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_4_rcq1m6.jpg"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/60" aria-hidden />
        </div>
        <div className="container-custom relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Talent, models &amp; creatives</h1>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed">
            Changer Fusions connects brands, events, and campaigns with professional models, MCs, stylists, and
            creatives—rooted in Mombasa and active across Kenya.
          </p>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What we do</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We support{" "}
            <strong className="font-semibold text-gray-900">live events, fashion and awards programmes</strong>, commercial
            shoots, and brand activations. That includes casting coordination, briefing talent, aligning with
            client creative direction, and making sure on-site execution matches the contract and schedule. Our work sits
            alongside our <Link href="/services" className="text-primary-600 font-semibold hover:underline">marketing and events services</Link>
            —so campaigns and talent logistics stay with one accountable team.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you are registering for the <strong className="font-semibold text-gray-900">Coast Fashion &amp; Modelling Awards</strong>{" "}
            or similar programmes we produce, category registration and certificates are handled through the dedicated
            event flow—not through a public &ldquo;directory&rdquo; of every participant. That keeps data accurate and
            avoids misleading profile pages.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">How to work with us</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed mb-4">
            <li>
              <strong className="font-semibold text-gray-900">General talent pool:</strong>{" "}
              <Link href="/application" className="text-primary-600 font-semibold hover:underline">
                Submit an application
              </Link>{" "}
              with your experience, location, and portfolio links so our bookings team can match you to suitable work.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Awards or event categories:</strong>{" "}
              <Link href="/events/register-as-model" className="text-primary-600 font-semibold hover:underline">
                Register for the relevant programme
              </Link>{" "}
              when registrations are open, and follow the instructions for photos, payments (if any), and voting links.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Brand or corporate bookings:</strong> email{" "}
              <a href="mailto:info@cmfagency.co.ke" className="text-primary-600 font-semibold hover:underline">
                info@cmfagency.co.ke
              </a>{" "}
              or use{" "}
              <Link href="/contact" className="text-primary-600 font-semibold hover:underline">
                Contact
              </Link>{" "}
              with scope, dates, and budget band—we will respond with availability and next steps.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Professional standards</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We expect punctuality, clear communication, and respect for crew and other talent on set. Minors and teen
            categories are handled with additional safeguards appropriate to family-facing events. We do not publish
            fabricated ratings, fake LinkedIn profiles, or placeholder names on this site; when we showcase work, it
            will be clearly credited and approved by the people involved.
          </p>

          <div className="mt-10 rounded-xl border border-primary-200 bg-primary-50 p-6 not-prose">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Get in touch</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong className="font-semibold text-gray-900">Email:</strong>{" "}
              <a href="mailto:info@cmfagency.co.ke" className="text-primary-600 font-semibold hover:underline">
                info@cmfagency.co.ke
              </a>
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong className="font-semibold text-gray-900">Phone:</strong> +254 797 777347
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong className="font-semibold text-gray-900">Studio:</strong> Ambalal Building, Nkrumah Road, Mombasa,
              Kenya
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
