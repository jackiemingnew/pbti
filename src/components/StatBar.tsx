type StatBarProps = {
  label: string;
  value: number;
};

export function StatBar({ label, value }: StatBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-amber-100/75">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-200 shadow-gold transition-all duration-500"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}
