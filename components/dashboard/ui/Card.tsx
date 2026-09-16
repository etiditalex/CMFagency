import type { HTMLAttributes } from "react";

export type CardVariant = "default" | "featured";

const BASE = "rounded-lg bg-surface";
const DEFAULT = "border border-hairline";
const FEATURED = "shadow-[0_1px_3px_rgba(17,72,192,.06)] bg-gradient-to-br from-brand-muted to-surface";

export function cardClassName(variant: CardVariant = "default", extra = "") {
  return [BASE, variant === "featured" ? FEATURED : DEFAULT, extra].filter(Boolean).join(" ");
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: boolean;
};

export function Card({ variant = "default", padding = true, className = "", ...props }: CardProps) {
  return <div className={cardClassName(variant, `${padding ? "p-5" : ""} ${className}`.trim())} {...props} />;
}
