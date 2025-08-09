"use client";

export default function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
