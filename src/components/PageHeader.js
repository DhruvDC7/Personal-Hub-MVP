"use client";

export default function PageHeader({ title, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between sm:flex-row sm:items-center">
      <h1 className="text-2xl font-bold text-slate-50">{title}</h1>
      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}
