export type DemoFieldType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "select"
  | "textarea"
  | "checkbox-group"
  | "number-visitors";

export type DemoField = {
  name: string;
  label: string;
  type: DemoFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For checkbox-group */
  checkboxes?: { value: string; label: string }[];
};

export type DemoSection = {
  title?: string;
  fields: DemoField[];
};

export type IndustryDemo = {
  slug: string;
  title: string;
  subtitle: string;
  sections: DemoSection[];
};

const VISITOR_COUNT_OPTIONS = ["1", "2", "3", "4", "5", "6+"];

function visitorsField(): DemoField {
  return {
    name: "visitorCount",
    label: "Number of Visitors",
    type: "number-visitors",
    required: true,
    options: VISITOR_COUNT_OPTIONS.map((v) => ({ value: v, label: v })),
  };
}

function contactFields(requiredEmail = false): DemoField[] {
  return [
    { name: "fullName", label: "Full Name", type: "text", required: true },
    {
      name: "phone",
      label: "Contact Number",
      type: "tel",
      required: true,
      placeholder: "712 345 678",
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      required: requiredEmail,
    },
  ];
}

export const INDUSTRY_DEMOS: IndustryDemo[] = [
  {
    slug: "retail-hospitality",
    title: "Fusion Xpress Retail & Hospitality Demo",
    subtitle: "Guest Check-in Form",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(true),
          {
            name: "reservationRef",
            label: "Reservation / Table Reference",
            type: "text",
            placeholder: "e.g. Table 12 or Order #1042",
          },
          {
            name: "visitType",
            label: "Visit Type",
            type: "select",
            required: true,
            options: [
              { value: "dine-in", label: "Dine in" },
              { value: "pickup", label: "Pickup" },
              { value: "delivery", label: "Delivery handoff" },
              { value: "event", label: "Private event" },
            ],
          },
        ],
      },
      {
        title: "Visit details",
        fields: [
          {
            name: "dietary",
            label: "Dietary requirements",
            type: "checkbox-group",
            checkboxes: [
              { value: "none", label: "None" },
              { value: "vegetarian", label: "Vegetarian" },
              { value: "halal", label: "Halal" },
              { value: "allergies", label: "Food allergies (see notes)" },
            ],
          },
          {
            name: "specialRequests",
            label: "Special requests",
            type: "textarea",
            placeholder: "Allergies, high chair, accessibility needs…",
          },
        ],
      },
    ],
  },
  {
    slug: "health-aged-care",
    title: "Fusion Xpress Health & Aged Care Demo",
    subtitle: "New Patient / Visitor Form",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(),
          { name: "idNumber", label: "National ID / Passport", type: "text", required: true },
          { name: "medicareNumber", label: "Medicare / NHIF Number", type: "text" },
          { name: "medicareExpiry", label: "Cover Expiry", type: "date" },
        ],
      },
      {
        title: "Social & Lifestyle History",
        fields: [
          {
            name: "alcohol",
            label: "1. Alcohol",
            type: "checkbox-group",
            checkboxes: [
              { value: "drinker", label: "Drinker" },
              { value: "non-drinker", label: "Non-drinker" },
            ],
          },
          {
            name: "tobacco",
            label: "2. Tobacco",
            type: "checkbox-group",
            checkboxes: [
              { value: "never", label: "Never smoke" },
              { value: "ceased", label: "Ceased smoking" },
              { value: "current", label: "Current smoker" },
            ],
          },
          {
            name: "exercise",
            label: "3. How often do you exercise per week?",
            type: "select",
            placeholder: "Number of days",
            options: [
              { value: "0", label: "0 days" },
              { value: "1-2", label: "1–2 days" },
              { value: "3-4", label: "3–4 days" },
              { value: "5+", label: "5+ days" },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "real-estate",
    title: "Fusion Xpress Real Estate Demo",
    subtitle: "Property Viewing Registration",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(true),
          {
            name: "propertyRef",
            label: "Property / Listing Reference",
            type: "text",
            required: true,
            placeholder: "Unit, plot, or listing ID",
          },
          { name: "agentName", label: "Agent to Meet", type: "text", required: true },
          { name: "viewingDate", label: "Viewing Date", type: "date", required: true },
        ],
      },
      {
        title: "Viewing details",
        fields: [
          {
            name: "buyerType",
            label: "I am visiting as",
            type: "select",
            required: true,
            options: [
              { value: "buyer", label: "Buyer" },
              { value: "tenant", label: "Tenant" },
              { value: "investor", label: "Investor" },
              { value: "agent", label: "Partner agent" },
            ],
          },
          {
            name: "financing",
            label: "Financing status",
            type: "select",
            options: [
              { value: "cash", label: "Cash buyer" },
              { value: "pre-approved", label: "Pre-approved mortgage" },
              { value: "exploring", label: "Still exploring" },
            ],
          },
          {
            name: "vehiclePlate",
            label: "Vehicle plate (for gate access)",
            type: "text",
          },
        ],
      },
    ],
  },
  {
    slug: "office-education",
    title: "Fusion Xpress Office & Education Demo",
    subtitle: "Visitor Registration Form",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(true),
          { name: "host", label: "Host / Person to Visit", type: "text", required: true },
          { name: "idPassport", label: "ID / Passport Number", type: "text", required: true },
          {
            name: "purpose",
            label: "Purpose of Visit",
            type: "select",
            required: true,
            options: [
              { value: "meeting", label: "Business meeting" },
              { value: "interview", label: "Interview" },
              { value: "delivery", label: "Delivery" },
              { value: "campus-tour", label: "Campus tour" },
              { value: "other", label: "Other" },
            ],
          },
        ],
      },
      {
        title: "Access details",
        fields: [
          {
            name: "building",
            label: "Building / Block",
            type: "select",
            required: true,
            options: [
              { value: "main", label: "Main tower" },
              { value: "annex", label: "Annex" },
              { value: "library", label: "Library" },
              { value: "labs", label: "Labs & research" },
            ],
          },
          {
            name: "equipment",
            label: "Bringing laptop or equipment?",
            type: "checkbox-group",
            checkboxes: [
              { value: "laptop", label: "Laptop" },
              { value: "camera", label: "Camera / AV gear" },
              { value: "none", label: "None" },
            ],
          },
          { name: "visitDate", label: "Visit Date", type: "date", required: true },
        ],
      },
    ],
  },
  {
    slug: "sports",
    title: "Fusion Xpress Sports Demo",
    subtitle: "Facility Guest Form",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(true),
          { name: "eventName", label: "Event / Match / Session", type: "text", required: true },
          { name: "teamAffiliation", label: "Team / Club / Organisation", type: "text" },
        ],
      },
      {
        title: "Facility use",
        fields: [
          {
            name: "guestType",
            label: "Guest type",
            type: "select",
            required: true,
            options: [
              { value: "spectator", label: "Spectator" },
              { value: "player", label: "Player / athlete" },
              { value: "official", label: "Official / referee" },
              { value: "media", label: "Media" },
              { value: "vendor", label: "Vendor" },
            ],
          },
          {
            name: "waiver",
            label: "Acknowledgements",
            type: "checkbox-group",
            checkboxes: [
              { value: "waiver", label: "I have signed the facility waiver" },
              { value: "rules", label: "I agree to venue rules" },
            ],
          },
          {
            name: "equipmentRental",
            label: "Equipment rental",
            type: "select",
            placeholder: "Select if applicable",
            options: [
              { value: "none", label: "None" },
              { value: "balls", label: "Balls / nets" },
              { value: "kit", label: "Full kit" },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "tourism",
    title: "Fusion Xpress Tourism Demo",
    subtitle: "Guest Registration Form",
    sections: [
      {
        fields: [
          visitorsField(),
          ...contactFields(true),
          { name: "nationality", label: "Nationality", type: "text", required: true },
          {
            name: "bookingRef",
            label: "Hotel / Booking Reference",
            type: "text",
            placeholder: "Confirmation code",
          },
        ],
      },
      {
        title: "Stay details",
        fields: [
          { name: "checkInDate", label: "Check-in Date", type: "date", required: true },
          { name: "checkOutDate", label: "Check-out Date", type: "date", required: true },
          {
            name: "tourPackage",
            label: "Tour / package",
            type: "select",
            options: [
              { value: "room-only", label: "Room only" },
              { value: "safari", label: "Safari package" },
              { value: "city-tour", label: "City tour" },
              { value: "conference", label: "Conference guest" },
            ],
          },
          {
            name: "transport",
            label: "Airport transfer needed?",
            type: "checkbox-group",
            checkboxes: [
              { value: "arrival", label: "Arrival pickup" },
              { value: "departure", label: "Departure drop-off" },
              { value: "none", label: "Not required" },
            ],
          },
        ],
      },
    ],
  },
];

export function getIndustryDemo(slug: string): IndustryDemo | undefined {
  return INDUSTRY_DEMOS.find((d) => d.slug === slug);
}

export const INDUSTRY_DEMO_SLUGS = INDUSTRY_DEMOS.map((d) => d.slug);
