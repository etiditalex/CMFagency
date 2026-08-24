import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchField({ value, onChange, placeholder = "Search services..." }: Props) {
  return (
    <label className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#EEEAF6] px-4">
      <Search className="h-4 w-4 text-fx-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full bg-transparent text-[14px] text-fx-ink outline-none placeholder:text-fx-muted"
      />
    </label>
  );
}
