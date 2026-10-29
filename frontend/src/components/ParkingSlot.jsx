// frontend/src/components/ParkingSlot.jsx
// Individual parking slot tile in the grid

import { Car, Shield, CheckCircle } from "lucide-react";

const statusConfig = {
  AVAILABLE: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-400",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    icon: <CheckCircle className="w-4 h-4 text-emerald-400 opacity-60" />,
    label: "Available",
  },
  OCCUPIED: {
    bg: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-400",
    dot: "bg-red-400",
    text: "text-red-400",
    icon: <Car className="w-4 h-4 text-red-400 opacity-80" />,
    label: "Occupied",
  },
  RESERVED: {
    bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 hover:border-yellow-400",
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    icon: <Shield className="w-4 h-4 text-yellow-400 opacity-80" />,
    label: "Reserved",
  },
};

export default function ParkingSlot({ slot, onClick, highlighted }) {
  const config = statusConfig[slot.status] || statusConfig.AVAILABLE;

  return (
    <button
      onClick={() => onClick && onClick(slot)}
      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none
        ${config.bg}
        ${highlighted ? "ring-2 ring-blue-400 scale-105" : ""}
        group`}
      style={{ minHeight: "72px" }}
      title={`${slot.slotId} — ${config.label}${slot.vehicleNumber ? ` (${slot.vehicleNumber})` : ""}`}
    >
      {/* Status dot */}
      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${config.dot}`} />

      {/* Slot icon */}
      <div className="mb-1">{config.icon}</div>

      {/* Slot ID */}
      <span className={`font-bold text-sm ${config.text}`}>{slot.slotId}</span>

      {/* Vehicle number (truncated) */}
      {slot.vehicleNumber && (
        <span className="text-slate-500 text-xs mt-0.5 truncate max-w-full px-1">
          {slot.vehicleNumber.length > 8
            ? slot.vehicleNumber.slice(0, 8) + "…"
            : slot.vehicleNumber}
        </span>
      )}
    </button>
  );
}
