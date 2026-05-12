import StatusChip from '@/components/StatusChip'

export default function PrototypeTable({
  columns,
  rows,
}: {
  columns: any[]
  rows: Record<string, any>[]
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#F9FAFC] border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-bold"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-slate-100 hover:bg-[#FAFBFE]"
            >
              {columns.map((col) => {
                const value = row[col.key]

                return (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {col.type === 'status' ? (
                      <StatusChip status={String(value || 'Pending')} />
                    ) : (
                      value
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
