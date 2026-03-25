"use client";

import { useId, useState } from "react";

type Variant = "blogs" | "footer" | "blogSidebar";

const formClass: Record<Variant, string> = {
  blogs: "flex flex-col sm:flex-row gap-4 max-w-md mx-auto",
  footer: "space-y-2",
  blogSidebar: "space-y-3 w-full",
};

const inputClass: Record<Variant, string> = {
  blogs:
    "flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white placeholder:text-gray-500",
  footer:
    "w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500",
  blogSidebar:
    "w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 shadow-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600",
};

const buttonClass: Record<Variant, string> = {
  blogs:
    "px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed shrink-0",
  footer: "w-full btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed",
  blogSidebar:
    "w-full py-2.5 rounded-lg bg-white text-primary-700 font-bold text-sm hover:bg-primary-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm",
};

const placeholder: Record<Variant, string> = {
  blogs: "Enter your email",
  footer: "Your email",
  blogSidebar: "Your email",
};

export default function NewsletterSubscribeForm({ variant }: { variant: Variant }) {
  const id = useId();
  const inputId = `${id}-newsletter-email`;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        alreadySubscribed?: boolean;
      };
      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          text: typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
        });
        return;
      }
      setEmail("");
      if (data.alreadySubscribed) {
        setFeedback({
          type: "success",
          text: "You're already on our list — you'll get updates when we publish new articles.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: "Thanks! Check your inbox for a confirmation from us.",
      });
    } catch {
      setFeedback({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const msgColor =
    variant === "blogs" || variant === "blogSidebar"
      ? feedback?.type === "success"
        ? "text-white/95"
        : "text-amber-200"
      : feedback?.type === "success"
        ? "text-green-400"
        : "text-amber-400";

  const inner = (
    <>
      <div className={variant === "blogs" ? "flex-1 w-full min-w-0" : undefined}>
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder={placeholder[variant]}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (feedback) setFeedback(null);
          }}
          className={inputClass[variant]}
          required
          disabled={loading}
          maxLength={254}
        />
      </div>
      <button type="submit" className={buttonClass[variant]} disabled={loading}>
        {loading ? "Subscribing…" : "Subscribe"}
      </button>
    </>
  );

  if (variant === "blogs") {
    return (
      <form className="w-full max-w-none mx-auto" onSubmit={onSubmit} noValidate>
        <div className={formClass.blogs}>{inner}</div>
        {feedback ? (
          <p className={`mt-4 text-center text-sm ${msgColor}`} role="status">
            {feedback.text}
          </p>
        ) : null}
      </form>
    );
  }

  if (variant === "blogSidebar") {
    return (
      <form className={formClass.blogSidebar} onSubmit={onSubmit} noValidate>
        {inner}
        {feedback ? (
          <p className={`text-xs leading-snug ${msgColor}`} role="status">
            {feedback.text}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form className={formClass.footer} onSubmit={onSubmit} noValidate>
      {inner}
      {feedback ? (
        <p className={`text-sm ${msgColor}`} role="status">
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
