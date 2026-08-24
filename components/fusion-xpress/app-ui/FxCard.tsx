import { FX_CARD_SHADOW } from "@/lib/fusion-xpress-app";

type Props = {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export default function FxCard({ children, className = "", padded = true }: Props) {
  return (
    <div
      className={`rounded-[20px] bg-fx-card ${padded ? "p-4" : ""} ${className}`}
      style={{ boxShadow: FX_CARD_SHADOW }}
    >
      {children}
    </div>
  );
}
