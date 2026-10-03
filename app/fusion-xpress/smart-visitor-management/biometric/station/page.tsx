"use client";

import { Suspense } from "react";

import BiometricAttendanceClient from "@/components/fusion-xpress/visitor-management/employees/BiometricAttendanceClient";

export default function BiometricStationPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Opening the fingerprint station…</p>}>
      <BiometricAttendanceClient mode="station" />
    </Suspense>
  );
}
