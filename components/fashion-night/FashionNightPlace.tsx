import Image from "next/image";

const MAP_EMBED =
  "https://www.google.com/maps?q=Mombasa%2C%20Kenya&z=12&output=embed&hl=en";
const MAP_ROUTE = "https://www.google.com/maps/dir/?api=1&destination=Mombasa%2C%20Kenya";

const EVENT_PHOTO =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg";

const SPONSOR_LOGO =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_1_llldgx.jpg";

export default function FashionNightPlace() {
  return (
    <div className="fashion-night-place">
      <section className="relative bg-[#e7e3da] md:h-[300px]" aria-labelledby="fashion-night-location-heading">
        <iframe
          title="Map of the Coast Region, Mombasa, Kenya"
          src={MAP_EMBED}
          className="h-64 w-full border-0 md:absolute md:inset-0 md:h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="fn-location-panel relative z-10 flex min-h-[220px] items-center justify-center bg-[#8a6a1e] px-5 py-8 text-white sm:px-8 sm:py-10 md:px-16">
          <div className="max-w-xs text-center md:pr-16">
            <h2 id="fashion-night-location-heading">Location</h2>
            <p className="fn-location-copy">
              Coast Region, Kenya
              <br />
              Mombasa, Kenya
            </p>
            <a className="fn-route" href={MAP_ROUTE} target="_blank" rel="noopener noreferrer">
              See route
            </a>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[380px] items-center justify-center overflow-hidden sm:min-h-[440px]" aria-labelledby="fashion-night-sponsor-heading">
        <Image
          src={EVENT_PHOTO}
          alt="Coast Fashion and Modelling Awards 2025"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center">
          <h2 id="fashion-night-sponsor-heading" className="fn-sponsor-title">Sponsor</h2>
          <div className="relative mt-6 h-40 w-44 bg-white shadow-lg sm:h-48 sm:w-52">
            <Image
              src={SPONSOR_LOGO}
              alt="Changer Fusions partner"
              fill
              className="object-contain p-4"
              sizes="208px"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
