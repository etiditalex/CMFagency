/**
 * Kenya’s 47 counties + optional local terms so job text like “Westlands” matches Nairobi County, etc.
 */

export type KenyaCountyDef = {
  label: string;
  /** Extra lowercase fragments likely to appear in job location text */
  extraTerms?: string[];
};

export const KENYA_COUNTY_DEFINITIONS: readonly KenyaCountyDef[] = [
  { label: "Mombasa County", extraTerms: ["nyali", "likoni", "bamburi", "shanzu", "diani"] },
  { label: "Kwale County", extraTerms: ["diani", "ukunda"] },
  { label: "Kilifi County", extraTerms: ["malindi", "watamu", "kaloleni"] },
  { label: "Tana River County", extraTerms: ["hola", "garsen"] },
  { label: "Lamu County", extraTerms: ["lamu island", "mpeketoni"] },
  { label: "Taita-Taveta County", extraTerms: ["voi", "wundanyi", "taveta"] },
  { label: "Garissa County" },
  { label: "Wajir County" },
  { label: "Mandera County" },
  { label: "Marsabit County", extraTerms: ["moyale"] },
  { label: "Isiolo County" },
  { label: "Meru County", extraTerms: ["maua", "chuka"] },
  { label: "Tharaka-Nithi County", extraTerms: ["chuka", "kathwana"] },
  { label: "Embu County", extraTerms: ["runyenjes"] },
  { label: "Kitui County", extraTerms: ["mwingi"] },
  { label: "Machakos County", extraTerms: ["athi river", "mavoko"] },
  { label: "Makueni County", extraTerms: ["wote", "emali"] },
  { label: "Nyandarua County", extraTerms: ["ol kalou"] },
  { label: "Nyeri County", extraTerms: ["karatina", "nyeri town"] },
  { label: "Kirinyaga County", extraTerms: ["kerugoya", "wanguru"] },
  { label: "Murang'a County", extraTerms: ["muranga", "murang’a", "kangema"] },
  { label: "Kiambu County", extraTerms: ["thika", "ruiru", "juja", "limuru", "kikuyu"] },
  { label: "Turkana County", extraTerms: ["lodwar", "kakuma"] },
  { label: "West Pokot County", extraTerms: ["kapenguria"] },
  { label: "Samburu County", extraTerms: ["maralal"] },
  { label: "Trans Nzoia County", extraTerms: ["kitale"] },
  { label: "Uasin Gishu County", extraTerms: ["eldoret", "burnt forest"] },
  { label: "Elgeyo-Marakwet County", extraTerms: ["iten", "kapsabet"] },
  { label: "Nandi County", extraTerms: ["kapsabet", "nandi hills"] },
  { label: "Baringo County", extraTerms: ["kabarnet", "marigat"] },
  { label: "Laikipia County", extraTerms: ["nyahururu", "nanyuki"] },
  { label: "Nakuru County", extraTerms: ["naivasha", "gilgil", "molo"] },
  { label: "Narok County", extraTerms: ["maasai mara", "kilgoris"] },
  { label: "Kajiado County", extraTerms: ["kitengela", "ngong", "kiserian", "loitokitok"] },
  { label: "Kericho County", extraTerms: ["litein"] },
  { label: "Bomet County", extraTerms: ["silibwet"] },
  { label: "Kakamega County", extraTerms: ["kakamega town", "butere"] },
  { label: "Vihiga County", extraTerms: ["mbale", "maragoli"] },
  { label: "Bungoma County", extraTerms: ["webuye", "kimilili"] },
  { label: "Busia County", extraTerms: ["nambale"] },
  { label: "Siaya County", extraTerms: ["bondo", "usenge"] },
  { label: "Kisumu County", extraTerms: ["kisumu city", "milimani", "maseno", "ahero"] },
  { label: "Homa Bay County", extraTerms: ["homa bay town", "mbita"] },
  { label: "Migori County", extraTerms: ["rongo", "awendo"] },
  { label: "Kisii County", extraTerms: ["kisii town", "oyugis"] },
  { label: "Nyamira County", extraTerms: ["nyamira town"] },
  {
    label: "Nairobi County",
    extraTerms: [
      "nairobi",
      "westlands",
      "karen",
      "kilimani",
      "eastleigh",
      "ruai",
      "cbd",
      "upperhill",
      "south b",
      "south c",
      "embakasi",
      "kasarani",
      "dagoretti",
      "rongai",
    ],
  },
];

function termsFromLabel(label: string): string[] {
  const lower = label.toLowerCase().trim();
  const out = new Set<string>();
  out.add(lower);
  const noCounty = lower.replace(/\s+county\s*$/i, "").trim();
  if (noCounty) {
    out.add(noCounty);
    out.add(noCounty.replace(/'/g, ""));
    noCounty.split("-").forEach((p) => {
      const x = p.trim().toLowerCase();
      if (x.length > 1) out.add(x);
    });
  }
  return [...out].filter(Boolean);
}

export function allMatchTerms(def: KenyaCountyDef): string[] {
  const base = termsFromLabel(def.label);
  const extra = (def.extraTerms ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
}

/** Counties whose label or match terms overlap the user’s typing (for suggestions). */
export function filterCountiesForInput(needle: string, limit = 14): KenyaCountyDef[] {
  const t = needle.trim().toLowerCase();
  if (!t) return [...KENYA_COUNTY_DEFINITIONS];
  return KENYA_COUNTY_DEFINITIONS.filter((def) => {
    if (def.label.toLowerCase().includes(t)) return true;
    return allMatchTerms(def).some((term) => term.includes(t) || t.includes(term));
  }).slice(0, limit);
}

/**
 * Turn applied location text into lowercase fragments: any fragment contained in job.location counts as a match.
 * Resolves full/partial county names to that county’s terms; otherwise uses the raw text (and comma-separated parts).
 */
export function resolveLocationSearchTerms(userInput: string): string[] {
  const raw = userInput.trim().toLowerCase();
  if (!raw) return [];

  const exact = KENYA_COUNTY_DEFINITIONS.find((d) => d.label.toLowerCase() === raw);
  if (exact) return allMatchTerms(exact);

  const noCountySuffix = raw.replace(/\s+county\s*$/i, "").trim();
  const exactShort = KENYA_COUNTY_DEFINITIONS.find(
    (d) => d.label.toLowerCase().replace(/\s+county\s*$/i, "") === noCountySuffix
  );
  if (exactShort) return allMatchTerms(exactShort);

  if (raw.length >= 2) {
    const matches = KENYA_COUNTY_DEFINITIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(raw) ||
        allMatchTerms(d).some((term) => term.includes(raw) || (raw.length >= 3 && raw.includes(term)))
    );
    if (matches.length === 1) return allMatchTerms(matches[0]);
    if (matches.length > 1 && raw.length >= 4) {
      const tighter = matches.filter((d) => d.label.toLowerCase().includes(raw));
      if (tighter.length === 1) return allMatchTerms(tighter[0]);
    }
  }

  const parts = raw
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return [...new Set(parts)];

  return [raw];
}

export function jobLocationMatchesAnyTerm(jobLocation: string | null, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const loc = (jobLocation ?? "").toLowerCase();
  return terms.some((t) => t.length > 0 && loc.includes(t));
}
