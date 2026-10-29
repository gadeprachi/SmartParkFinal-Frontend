// frontend/src/components/VehicleForm.jsx
// Vehicle entry form

import { useState } from "react";
import { Car, Search, Loader2 } from "lucide-react";

const VEHICLE_TYPES = ["Car", "Motorcycle", "SUV", "Truck", "Other"];

export default function VehicleForm({ onSubmit, loading }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = vehicleNumber.trim().toUpperCase();

    if (!trimmed) {
      setError("Please enter a vehicle number.");
      return;
    }
    if (trimmed.length < 4) {
      setError("Vehicle number must be at least 4 characters.");
      return;
    }

    setError("");
    onSubmit(trimmed, vehicleType);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vehicle Number */}
      <div>
        <label className="block text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
          Vehicle Number
        </label>
        <div className="relative">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => {
              setVehicleNumber(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="e.g. MH12AB1234"
            maxLength={20}
            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border text-white placeholder-slate-600 outline-none transition-all
              ${error ? "border-red-500/50 focus:border-red-400" : "border-slate-700 focus:border-emerald-500"}
              focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]`}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-red-400 text-xs">{error}</p>
        )}
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="block text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
          Vehicle Type
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setVehicleType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${vehicleType === type
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding Slot…
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Find Parking Slot
          </>
        )}
      </button>
    </form>
  );
}
