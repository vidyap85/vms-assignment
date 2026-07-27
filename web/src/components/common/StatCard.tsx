import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accentClass?: string;
}

export default function StatCard({ label, value, sub, icon, accentClass = "text-accent" }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-surface-400">{label}</span>
        {icon && <span className={accentClass}>{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-surface-50">{value}</div>
      {sub && <div className="text-xs text-surface-500">{sub}</div>}
    </div>
  );
}
