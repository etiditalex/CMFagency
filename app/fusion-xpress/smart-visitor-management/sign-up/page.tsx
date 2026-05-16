import VisitorAuthLayout from "@/components/fusion-xpress/visitor-management/VisitorAuthLayout";
import VisitorSignUpForm from "@/components/fusion-xpress/visitor-management/VisitorSignUpForm";

export const metadata = {
  title: "Sign Up | Smart Visitor Management | Fusion Xpress",
  description: "Create your Fusion Xpress Smart Visitor Management account.",
};

export default function VisitorSignUpPage() {
  return (
    <VisitorAuthLayout mode="sign-up">
      <VisitorSignUpForm />
    </VisitorAuthLayout>
  );
}
