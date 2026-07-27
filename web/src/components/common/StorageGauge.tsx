import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatBytes } from "../../lib/format";

interface StorageGaugeProps {
  usedPercent: number;
  usedBytes: number;
  capacityBytes: number;
}

function statusColor(pct: number): { fill: string; label: string } {
  if (pct >= 90) return { fill: "#d03b3b", label: "Critical" };
  if (pct >= 70) return { fill: "#fab219", label: "Warning" };
  return { fill: "#0ca30c", label: "Healthy" };
}

export default function StorageGauge({ usedPercent, usedBytes, capacityBytes }: StorageGaugeProps) {
  const pct = Math.max(0, Math.min(100, usedPercent));
  const { fill, label } = statusColor(pct);
  const data = [
    { name: "Used", value: pct },
    { name: "Free", value: 100 - pct },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={38}
              outerRadius={54}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={fill} />
              <Cell fill="#2c3648" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-surface-50">{pct.toFixed(0)}%</span>
          <span className="text-[10px] uppercase tracking-wide text-surface-400">used</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: fill }} />
          <span className="font-medium text-surface-100">{label}</span>
        </div>
        <div className="text-surface-300">
          {formatBytes(usedBytes)} <span className="text-surface-500">/</span> {formatBytes(capacityBytes)}
        </div>
        <div className="text-xs text-surface-500">{(100 - pct).toFixed(0)}% free</div>
      </div>
    </div>
  );
}
