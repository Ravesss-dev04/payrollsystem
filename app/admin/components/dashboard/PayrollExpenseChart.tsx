"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PayrollTrendPoint } from "../../dashboard/types";
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
export default function PayrollExpenseChart({
  data,
}: {
  data: PayrollTrendPoint[];
}) {
  return (
    <section
      aria-labelledby="payroll-chart"
      className="min-w-0 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm"
    >
      <h2 id="payroll-chart" className="text-base font-bold">
        Payroll Expense Trend
      </h2>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-bold">?2.41M</p>
        <p className="text-sm text-[#73718A]">This Cutoff</p>
        <p className="text-xs font-semibold text-green-600">
          ? 6.8%{" "}
          <span className="font-normal text-[#73718A]">vs. last cutoff</span>
        </p>
      </div>
      <p className="sr-only">
        Illustrative payroll trend:{" "}
        {data
          .map((point) => `${point.month}: ${money.format(point.amount)}`)
          .join(", ")}
        .
      </p>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#eeecf4" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#73718A" }}
            />
            <YAxis
              width={52}
              domain={[0, 3000000]}
              ticks={[0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000]}
              tickFormatter={(value) =>
                value === 0
                  ? "?0"
                  : value < 1000000
                    ? `?${value / 1000}K`
                    : `?${value / 1000000}M`
              }
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#73718A" }}
            />
            <Tooltip
              formatter={(value) => money.format(Number(value))}
              cursor={{ fill: "#F7F6FF" }}
            />
            <Bar
              dataKey="amount"
              name="Payroll"
              radius={[5, 5, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            >
              {data.map((point, index) => (
                <Cell
                  key={point.month}
                  fill={index === data.length - 1 ? "#7C3AED" : "#C4B1F5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
