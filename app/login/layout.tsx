import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Sign In to Your Account | Changer Fusions",
  description: "Sign in to your Changer Fusions account to access your dashboard and track your applications. Create an account to get started.",
  icons: {
    icon: [
      { url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg", sizes: "any" },
      { url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg", type: "image/jpeg" },
    ],
    shortcut: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
    apple: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
  },
  openGraph: {
    title: "Login - Sign In to Your Account | Changer Fusions",
    description: "Sign in to your Changer Fusions account to access your dashboard and track your applications.",
    url: "https://cmfagency.co.ke/login",
    images: [
      {
        url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
        width: 1200,
        height: 630,
        alt: "Changer Fusions Login",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Login - Sign In to Your Account | Changer Fusions",
    description: "Sign in to your Changer Fusions account to access your dashboard and track your applications.",
    images: ["https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

