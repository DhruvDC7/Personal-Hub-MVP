/**
 * Small metric card for dashboard stats.
 * Expects pre-formatted value strings.
 */
export default function StatsCard({ title, value, deltaPct, valueClass = '', deltaColor, subtitle }) {
  const delta = typeof deltaPct === 'number' ? deltaPct : null;
  const DeltaIcon = delta !== null && delta < 0 ? DownIcon : UpIcon;
  const deltaCls = deltaColor || (delta !== null && delta < 0 ? 'text-red-500' : 'text-green-500');

  return (
    <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <div className="mt-2 flex items-end justify-between">
        <span className={`text-2xl font-semibold text-slate-50 ${valueClass}`}>{value}</span>
        {delta !== null && (
          <span className={`flex items-center text-sm ${deltaCls}`}>
            <DeltaIcon className="w-4 h-4 mr-1" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

function UpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18" />
    </svg>
  );
}

function DownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7-7-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V3" />
    </svg>
  );
}

