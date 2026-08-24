import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function MenuRow({ href, label, icon: Icon }: Props) {
  return (
    <Link href={href} className="flex min-h-[56px] items-center gap-3 px-1">
      <Icon className="h-5 w-5 text-fx-muted" strokeWidth={1.7} />
      <span className="flex-1 text-[15px] font-semibold text-fx-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-fx-inactive" />
    </Link>
  );
}
