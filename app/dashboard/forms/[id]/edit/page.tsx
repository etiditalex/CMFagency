"use client";

import { useParams } from "next/navigation";

import FusionFormEditor from "@/components/dashboard/FusionFormEditor";

export default function EditDashboardFormPage() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return <FusionFormEditor formId={id} />;
}
