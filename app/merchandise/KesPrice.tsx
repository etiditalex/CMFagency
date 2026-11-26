export default function KesPrice({
  amount,
  currencyClass = "text-sm",
  amountClass = "text-xl",
}: {
  amount: number;
  currencyClass?: string;
  amountClass?: string;
}) {
  const formatted = Math.round(amount).toLocaleString("en-KE");
  return (
    <span className="font-bold leading-none text-[#191919]">
      <span className={currencyClass}>KSh</span>
      <span className={amountClass}>{formatted}</span>
    </span>
  );
}
