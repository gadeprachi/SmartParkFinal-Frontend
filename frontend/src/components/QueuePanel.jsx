// frontend/src/components/QueuePanel.jsx
// Displays the FIFO waiting queue

import { Clock, Users, ArrowRight } from "lucide-react";

export default function QueuePanel({ queue = [] }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Waiting Queue</h3>
            <p className="text-slate-500 text-xs">FIFO — First In, First Out</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-xs font-bold">{queue.length}</span>
        </div>
      </div>

      {/* DSA Note */}
      <div className="mb-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50">
        <p className="text-slate-500 text-xs">
          <span className="text-orange-400 font-medium">DSA Queue:</span> Vehicles wait here when all slots are full.
          First vehicle to arrive gets the next freed slot.
        </p>
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No vehicles waiting</p>
          <p className="text-slate-600 text-xs mt-1">Queue is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Arrow flow indicator */}
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-3">
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400">FRONT</span>
            <ArrowRight className="w-3 h-3" />
            <span className="text-slate-600">vehicles wait here</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400">BACK</span>
          </div>

          {queue.map((vehicle, index) => (
            <div
              key={vehicle.vehicleNumber}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                ${index === 0
                  ? "bg-orange-500/10 border-orange-500/30 shadow-sm"
                  : "bg-slate-800/50 border-slate-700/30"
                }`}
            >
              {/* Position badge */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${index === 0
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-slate-700 text-slate-400"
                  }`}
              >
                {index + 1}
              </div>

              {/* Vehicle info */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${index === 0 ? "text-orange-300" : "text-slate-300"}`}>
                  {vehicle.vehicleNumber}
                </p>
                <p className="text-slate-500 text-xs">{vehicle.vehicleType || "Car"}</p>
              </div>

              {/* Wait time */}
              {vehicle.entryTime && (
                <div className="flex items-center gap-1 text-slate-500 text-xs shrink-0">
                  <Clock className="w-3 h-3" />
                  {Math.round((Date.now() - new Date(vehicle.entryTime)) / 60000)}m
                </div>
              )}

              {/* "Next" badge for first */}
              {index === 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Next
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
