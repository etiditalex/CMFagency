/** Parse `/jobs/external/{uuid}` or `/jobs/external/{source}--{external_id}` */
export function parseExternalJobParam(
  raw: string
): { kind: "uuid"; id: string } | { kind: "composite"; source: string; externalId: string } | null {
  const id = decodeURIComponent(raw || "").trim();
  if (!id) return null;
  const composite = id.match(/^([a-z0-9_]+)--(.+)$/i);
  if (composite) {
    return { kind: "composite", source: composite[1].toLowerCase(), externalId: composite[2] };
  }
  return { kind: "uuid", id };
}

export function externalJobDetailPath(source: string, externalId: string): string {
  return `/jobs/external/${encodeURIComponent(`${source}--${externalId}`)}`;
}
