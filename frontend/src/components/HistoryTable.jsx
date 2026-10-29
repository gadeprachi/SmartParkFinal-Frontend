// frontend/src/components/HistoryTable.jsx
// Paginated parking history table

import { Clock, Car, Hash, ArrowUpDown } from "lucide-react";

function formatTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function HistoryTable({ history = [] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No parking history yet</p>
        <p className="text-slate-600 text-xs mt-1">Completed sessions will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Vehicle
            </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Slot
            </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Entry
            </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Exit
            </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Duration
            </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((record, index) => (
            <tr
              key={record._id || index}
              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-white font-semibold">{record.vehicleNumber}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-300 font-mono text-xs">
                  {record.slotId}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-400 text-xs">{formatTime(record.entryTime)}</td>
              <td className="py-3 px-4 text-slate-400 text-xs">{formatTime(record.exitTime)}</td>
              <td className="py-3 px-4">
                <span className="text-emerald-400 font-medium text-xs">
                  {formatDuration(record.duration)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  {record.vehicleType || "Car"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
