"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ComboPoint = {
  label: string;
  a: number;
  b: number;
  line: number;
};

/** Grouped bars + dotted trend line in the studio-dark palette, like the
    reference's main generation chart. */
export function ComboChart({
  data,
  height = 260,
}: {
  data: ComboPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} barGap={2}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9c96a8", fontSize: 12 }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9c96a8", fontSize: 12 }}
          width={36}
        />
        <Tooltip
          cursor={{ fill: "rgba(245, 184, 41, 0.1)" }}
          contentStyle={{
            borderRadius: 14,
            border: "1px solid rgba(244, 241, 234, 0.1)",
            background: "#201d2b",
            color: "#f4f1ea",
            boxShadow: "0 12px 40px rgb(0 0 0 / 0.55)",
            fontSize: 13,
          }}
          labelStyle={{ color: "#9c96a8" }}
        />
        <Bar dataKey="a" fill="#F5B829" radius={[4, 4, 4, 4]} barSize={7} />
        <Bar dataKey="b" fill="#A78BFA" radius={[4, 4, 4, 4]} barSize={7} />
        <Line
          type="monotone"
          dataKey="line"
          stroke="#7DD3FC"
          strokeWidth={1.5}
          strokeDasharray="1 0"
          dot={{ r: 2.5, fill: "#7DD3FC" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
