"use client";

import { useSearchParams } from "next/navigation";

import IndustryDemoForm from "@/components/fusion-xpress/visitor-management/IndustryDemoForm";
import type { IndustryDemo } from "@/lib/visitors/industry-demos";

export default function IndustryDemoFormClient({ demo }: { demo: IndustryDemo }) {
  const searchParams = useSearchParams();
  const ownerId =
    searchParams?.get("owner")?.trim() ||
    searchParams?.get("business")?.trim() ||
    undefined;

  return <IndustryDemoForm demo={demo} ownerId={ownerId} />;
}
