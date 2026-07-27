import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface CameraStatusBarProps {
  online: number;
  offline: number;
}

export default function CameraStatusBar({ online, offline }: CameraStatusBarProps) {
  const data = [
    { label: "Online", value: online, fill: "#0ca30c" },
    { label: "Offline", value: offline, fill: "#d03b3b" },
  ];

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }} barSize={18}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "#898781", fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.fill} />
            ))}
            <LabelList dataKey="value" position="right" fill="#e9edf3" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
