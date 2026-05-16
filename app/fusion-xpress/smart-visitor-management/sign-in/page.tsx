import VisitorAuthLayout from "@/components/fusion-xpress/visitor-management/VisitorAuthLayout";
import VisitorSignInForm from "@/components/fusion-xpress/visitor-management/VisitorSignInForm";

export const metadata = {
  title: "Sign In | Smart Visitor Management | Fusion Xpress",
  description: "Sign in to your Fusion Xpress Smart Visitor Management dashboard.",
};

export default function VisitorSignInPage() {
  return (
    <VisitorAuthLayout mode="sign-in">
      <VisitorSignInForm />
    </VisitorAuthLayout>
  );
}
