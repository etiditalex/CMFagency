import { Suspense } from "react";

import VisitorAuthLayout from "@/components/fusion-xpress/visitor-management/VisitorAuthLayout";
import VisitorVerifyEmailForm from "@/components/fusion-xpress/visitor-management/VisitorVerifyEmailForm";

export const metadata = {
  title: "Verify Email | Smart Visitor Management | Fusion Xpress",
  description: "Verify your email to activate your Smart Visitor Management account.",
};

export default function VisitorVerifyEmailPage() {
  return (
    <VisitorAuthLayout mode="sign-in">
      <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading…</p>}>
        <VisitorVerifyEmailForm />
      </Suspense>
    </VisitorAuthLayout>
  );
}
