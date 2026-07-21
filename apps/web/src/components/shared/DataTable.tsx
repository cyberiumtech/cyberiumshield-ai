import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string | number }>({ columns, data, onRowClick }: DataTableProps<T>) {
  const getCellValue = (row: T, accessor: Column<T>['accessor']) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  return (
    <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left font-semibold ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((column, index) => (
                    <td key={index} className={`px-6 py-4 text-slate-300 ${column.className || ''}`}>
                      {getCellValue(row, column.accessor)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
