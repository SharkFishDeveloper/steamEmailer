interface StatProps {
  label: string;
  value: string;
  accent?: string;
}

export default function Stat({ label, value, accent }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[#8ba3b8] font-semibold">
        {label}
      </span>
      <span className="text-base font-bold" style={{ color: accent || "#c7d5e0" }}>
        {value}
      </span>
    </div>
  );
}