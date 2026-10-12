import Image from "next/image";

const MAP_EMBED =
  "https://www.google.com/maps?q=City%20Blue%20Creekside%20Hotel%2C%20Mombasa%2C%20Kenya&z=15&output=embed&hl=en";
const MAP_ROUTE =
  "https://www.google.com/maps/dir/?api=1&destination=City%20Blue%20Creekside%20Hotel%2C%20Mombasa%2C%20Kenya";

const EVENT_PHOTO =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_7_kmoxak.jpg";

const SPONSOR_LOGO =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840790/China_Square_mmdat8.jpg";

export default function FashionShowPlace() {
  return (
    <div className="fashion-night-place">
      <section className="relative bg-[#e7e3da] md:h-[300px]" aria-labelledby="fashion-show-location-heading">
        <iframe
          title="Map of City Blue Creekside Hotel, Mombasa, Kenya"
          src={MAP_EMBED}
          className="h-64 w-full border-0 md:absolute md:inset-0 md:h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="fn-location-panel relative z-10 flex min-h-[220px] items-center justify-center bg-[#8a6a1e] px-5 py-8 text-white sm:px-8 sm:py-10 md:px-16">
          <div className="max-w-xs text-center md:pr-16">
            <h2 id="fashion-show-location-heading">Location</h2>
            <p className="fn-location-copy">
              City Blue Creekside Hotel
              <br />
              Mombasa, Kenya
            </p>
            <a className="fn-route" href={MAP_ROUTE} target="_blank" rel="noopener noreferrer">
              See route
            </a>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[380px] items-center justify-center overflow-hidden sm:min-h-[440px]" aria-labelledby="fashion-show-sponsor-heading">
        <Image
          src={EVENT_PHOTO}
          alt="2026 Fashion Show"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center">
          <h2 id="fashion-show-sponsor-heading" className="fn-sponsor-title">Sponsor</h2>
          <div className="relative mt-6 h-28 w-48 overflow-hidden shadow-lg sm:h-32 sm:w-56">
            <Image
              src={SPONSOR_LOGO}
              alt="China Square"
              fill
              className="object-cover"
              sizes="224px"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
