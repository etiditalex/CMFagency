const SOCIAL = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/187Kse9GrQ/",
    icon: "facebook" as const,
  },
  {
    label: "X",
    href: "https://x.com/ChangerFusions",
    icon: "x" as const,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/changer-fusions-2262a53a3?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
    icon: "linkedin" as const,
  },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/search/pins/?q=Changer%20Fusions%20CMF%20Agency",
    icon: "pinterest" as const,
  },
];

function SocialIcon({ kind }: { kind: (typeof SOCIAL)[number]["icon"] }) {
  const className = "h-5 w-5 text-gray-900";
  switch (kind) {
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.647 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.001 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      );
  }
}

/**
 * Centered editorial / tips + social strip for blog articles (after CMFA promo).
 */
export default function BlogEditorialDesk() {
  return (
    <section
      className="not-prose mt-6 rounded-lg border border-gray-200 bg-white px-4 py-5 sm:px-5 sm:py-6 font-sans shadow-sm"
      aria-label="Editorial desk"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl !text-center">Editorial Desk</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem] !text-center">
          Stories, event highlights, and insight from the Changer Fusions team on marketing, creative
          production, and culture across Kenya and the wider region.
        </p>
        <p className="mt-2 text-sm text-gray-600 sm:text-[0.9375rem] !text-center">
          Send tips to{" "}
          <a href="mailto:info@cmfagency.co.ke" className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
            info@cmfagency.co.ke
          </a>
          .
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
        {SOCIAL.map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 transition hover:text-primary-600"
            aria-label={`Changer Fusions on ${label}`}
          >
            <SocialIcon kind={icon} />
          </a>
        ))}
      </div>
    </section>
  );
}
