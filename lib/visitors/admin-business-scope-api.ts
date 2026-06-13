import { NextResponse } from "next/server";

import type { AdminOwnerScope } from "@/lib/visitors/admin-business-scope";

export function adminOwnerScopeErrorResponse(scope: AdminOwnerScope): NextResponse | null {
  if (scope.ok) return null;
  const status = scope.code === "missing_owner" ? 400 : 404;
  return NextResponse.json(
    {
      error: scope.message,
      missingOwner: scope.code === "missing_owner",
    },
    { status }
  );
}

/** Append owner query param for admin-scoped API calls. */
export function withOwnerQuery(url: string, isAdmin: boolean, ownerId: string): string {
  if (!isAdmin || !ownerId.trim()) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}owner=${encodeURIComponent(ownerId.trim())}`;
}

/** Preserve owner param in dashboard links for admins. */
export function pathWithOwner(path: string, ownerId: string | null | undefined): string {
  const id = String(ownerId ?? "").trim();
  if (!id) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}owner=${encodeURIComponent(id)}`;
}
