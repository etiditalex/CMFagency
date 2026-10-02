export type ManagedRoute = {
  route: string;
  section: "services" | "careers";
};

export const MANAGED_PAGES_ROUTES: ManagedRoute[] = [
  // Services (exclude /services/website-development as requested)
  { route: "/services/digital-marketing", section: "services" },
  { route: "/services/social-media-marketing", section: "services" },
  { route: "/services/branding", section: "services" },
  { route: "/services/market-research", section: "services" },
  { route: "/services/events-marketing", section: "services" },
  { route: "/services/content-creation", section: "services" },

  // Career development stays under the job board. Dropdown tracks redirect.
  { route: "/careers", section: "careers" },
];

export function getManagedRoute(route: string): ManagedRoute | undefined {
  return MANAGED_PAGES_ROUTES.find((r) => r.route === route);
}

