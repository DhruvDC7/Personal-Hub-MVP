"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Line chart showing net worth over months
export default function NetWorthLine({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 text-center">No data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

