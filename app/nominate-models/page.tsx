import { redirect } from "next/navigation";

/** Poster URL alias → canonical nominate page */
export default function NominateModelsRedirectPage() {
  redirect("/events/nominate-model");
}
