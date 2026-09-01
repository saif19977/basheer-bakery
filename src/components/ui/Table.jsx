export const Table = ({ headers, children }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 w-full">
    <table className="w-full text-right border-collapse min-w-[600px]">
      <thead><tr className="bg-gray-50 border-b border-gray-100">{headers.map((h, i) => <th key={i} className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
  </div>
);
