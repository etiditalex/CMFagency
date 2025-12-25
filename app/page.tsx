import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import StatsSection from "@/components/home/StatsSection";
import NewsSection from "@/components/home/NewsSection";
import CTABanner from "@/components/home/CTABanner";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedEvents />
      <CoreValues />
      <QuickLinks />
      <StatsSection />
      <NewsSection />
      <CTABanner />
    </>
  );
}






