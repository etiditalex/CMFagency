import Link from "next/link";

export default function FashionShowNotice() {
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
          Coast Fashion and Modelling Awards 2026 was held on <time dateTime="2026-08-15">15 August</time> at City Blue
          Creekside Hotel, Mombasa.{" "}
        </span>
        <Link href="/events">Open the Changer Fusions calendar</Link>
      </p>
    </div>
  );
}
