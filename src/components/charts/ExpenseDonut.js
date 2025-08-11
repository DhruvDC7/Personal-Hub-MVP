"use client";

import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#e879f9'];

// Donut chart for expense category breakdown
export default function ExpenseDonut({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 text-center">No data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

