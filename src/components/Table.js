"use client";

export default function Table({ columns, data, className = '', emptyState = 'No data available' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-slate-700 ${className}`}>
        <thead className="bg-slate-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-800 transition-colors">
                {columns.map((column) => (
                  <td
                    key={`${column.key}-${rowIndex}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-50"
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-slate-400">
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
