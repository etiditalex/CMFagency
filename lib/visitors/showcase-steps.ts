/** How-it-works carousel for Smart Visitor Management auth & marketing pages. */
export const VISITOR_SHOWCASE_STEPS = [
  {
    step: "01",
    title: "Display & Scan",
    description:
      "Set up a welcome screen or print a QR code PDF and display it at your entrance.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922802/Display_Scan_yt9aeb.jpg",
    alt: "Visitor scanning a QR code on a tablet at check-in",
  },
  {
    step: "02",
    title: "Scan & Check In",
    description:
      "Guests scan the check-in QR code or present an allocated visitor pass at reception.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922802/Complete_Details_hswwzi.jpg",
    alt: "Visitor completing a digital registration form on a phone",
  },
  {
    step: "03",
    title: "Realtime Records",
    description:
      "Visitor records and your dashboard are available in the system 24/7.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922801/Paperless_Records_doq9nh.jpg",
    alt: "Real-time visitor records and analytics on mobile",
  },
] as const;
