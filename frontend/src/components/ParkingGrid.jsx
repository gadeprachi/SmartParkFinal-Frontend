// frontend/src/components/ParkingGrid.jsx
// Visual 4×5 parking lot grid

import ParkingSlot from "./ParkingSlot";
import { useState } from "react";
import { X, Car, Clock, Hash } from "lucide-react";

const ROWS = ["A", "B", "C", "D"];

export default function ParkingGrid({ slots = [], highlightSlot, onNotify }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Group slots by row letter
  const grouped = ROWS.reduce((acc, row) => {
    acc[row] = slots
      .filter((s) => s.slotId.startsWith(row))
      .sort((a, b) => a.slotId.localeCompare(b.slotId));
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Reserved
        </span>
        <span className="text-slate-600 ml-auto">Click any slot for details</span>
      </div>

      {/* Entrance label */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          ENTRANCE
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-2">
            {/* Row label */}
            <span className="text-slate-600 text-xs font-bold w-4 shrink-0">{row}</span>
            {/* Slots */}
            <div className="flex-1 grid grid-cols-5 gap-2">
              {grouped[row]?.length > 0 ? (
                grouped[row].map((slot) => (
                  <ParkingSlot
                    key={slot.slotId}
                    slot={slot}
                    onClick={setSelectedSlot}
                    highlighted={highlightSlot === slot.slotId}
                  />
                ))
              ) : (
                <div className="col-span-5 text-slate-600 text-xs text-center py-2">
                  No slots in row {row}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Exit label */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          EXIT
        </div>
      </div>

      {/* Slot Detail Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-xl">Slot {selectedSlot.slotId}</h3>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    selectedSlot.status === "AVAILABLE"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : selectedSlot.status === "OCCUPIED"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {selectedSlot.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Hash className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Slot ID:</span>
                <span className="text-white font-medium">{selectedSlot.slotId}</span>
              </div>

              {selectedSlot.vehicleNumber && (
                <div className="flex items-center gap-3 text-sm">
                  <Car className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="text-white font-medium">{selectedSlot.vehicleNumber}</span>
                </div>
              )}

              {selectedSlot.updatedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">Updated:</span>
                  <span className="text-white font-medium">
                    {new Date(selectedSlot.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {selectedSlot.status === "AVAILABLE" && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 text-xs">
                    ✅ This slot is ready for a new vehicle.
                  </p>
                </div>
              )}

              {selectedSlot.status === "OCCUPIED" && onNotify && (
                <button
                  onClick={() => onNotify(selectedSlot)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold"
                >
                  🔔 Notify me when available
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedSlot(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
