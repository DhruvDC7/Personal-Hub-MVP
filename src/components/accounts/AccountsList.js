import { formatINR } from '@/lib/format';

// Compact list of accounts with balance and trend arrow
export default function AccountsList({ accounts }) {
  if (!accounts || accounts.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No records found</p>;
  }

  return (
    <ul className="divide-y divide-slate-700">
      {accounts.map((acc, idx) => (
        <li key={idx} className="flex items-center justify-between py-3">
          <span className="text-sm text-slate-50">{acc.name}</span>
          <span className="flex items-center text-sm">
            {formatINR(acc.balance)}
            {acc.trend === 'up' ? (
              <UpIcon className="w-4 h-4 ml-1 text-green-500" />
            ) : (
              <DownIcon className="w-4 h-4 ml-1 text-red-500" />
            )}
          </span>
        </li>
      ))}
    </ul>
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

