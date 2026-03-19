export type ManagedRoute = {
  route: string;
  section: "services" | "careers";
};

export const MANAGED_PAGES_ROUTES: ManagedRoute[] = [
  // Services (exclude /services/website-development as requested)
  { route: "/services/digital-marketing", section: "services" },
  { route: "/services/branding", section: "services" },
  { route: "/services/market-research", section: "services" },
  { route: "/services/events-marketing", section: "services" },
  { route: "/services/content-creation", section: "services" },

  // Careers (top + sub categories/opportunities)
  { route: "/careers", section: "careers" },
  { route: "/careers/attachments", section: "careers" },
  { route: "/careers/internships", section: "careers" },
  { route: "/careers/jobs", section: "careers" },
  { route: "/careers/attachments/marketing-opportunities", section: "careers" },
  { route: "/careers/attachments/fashion-opportunities", section: "careers" },
  { route: "/careers/attachments/events-opportunities", section: "careers" },
  { route: "/careers/attachments/education-opportunities", section: "careers" },
  { route: "/careers/internships/marketing-opportunities", section: "careers" },
  { route: "/careers/internships/fashion-opportunities", section: "careers" },
  { route: "/careers/internships/events-opportunities", section: "careers" },
  { route: "/careers/internships/education-opportunities", section: "careers" },
  { route: "/careers/jobs/marketing-opportunities", section: "careers" },
  { route: "/careers/jobs/fashion-opportunities", section: "careers" },
  { route: "/careers/jobs/events-opportunities", section: "careers" },
  { route: "/careers/jobs/education-opportunities", section: "careers" },
];

export function getManagedRoute(route: string): ManagedRoute | undefined {
  return MANAGED_PAGES_ROUTES.find((r) => r.route === route);
}

