import Link from "next/link";

export default function FashionNightNotice() {
  return (
    <div className="fn-notice" role="status">
      <p>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.2 2.6 20.2h18.8L12 3.2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M12 9.2v5.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
        </svg>
        <span>
          Coast Fashion and Modelling Awards 2025 was held on <time dateTime="2025-05-15">15 May</time> in the Coast
          Region, Kenya.{" "}
        </span>
        <Link href="/events">Open the Changer Fusions calendar</Link>
      </p>
    </div>
  );
}
