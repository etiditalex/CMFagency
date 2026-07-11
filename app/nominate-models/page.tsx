import { permanentRedirect } from "next/navigation";

/** Poster / marketing URL → canonical nominate page (301/308 for SEO). */
export default function NominateModelsRedirectPage() {
  permanentRedirect("/events/nominate-model");
}
