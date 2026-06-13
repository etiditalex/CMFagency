import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function integrationJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

export function integrationOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
