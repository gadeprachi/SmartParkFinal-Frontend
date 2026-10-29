// frontend/src/pages/Parking.jsx
// ============================================================
// Main parking flow page:
//   1. Enter vehicle number
//   2. System checks slots
//   3. Slot assigned OR vehicle queued
//   4. Navigate to slot (GPS map)
//   5. Navigate to exit (GPS map)
//   6. Exit parking → slot freed → queue updated
// ============================================================

import { useState, useCallback } from "react";
import {
  Car, ParkingCircle, Navigation, LogOut, CheckCircle,
  Clock, ArrowRight, MapPin, RefreshCw, X
} from "lucide-react";
import VehicleForm from "../components/VehicleForm";
import MapView from "../components/MapView";
import { parkVehicle, exitVehicle } from "../api/parkingApi";
import { rememberParkingLocation } from "../api/parkingApi";
import { getSessionId } from "../api/session";
import { ToastContainer, useToast } from "../components/Toast";

// ─── Step states ────────────────────────────────────────────
const STEP = {
  FORM:          "FORM",          // Initial form
  PARKED:        "PARKED",        // Slot assigned
  QUEUED:        "QUEUED",        // Added to queue
  NAV_TO_SLOT:   "NAV_TO_SLOT",  // Map: navigate to slot
  NAV_TO_EXIT:   "NAV_TO_EXIT",  // Map: navigate to exit
  EXITED:        "EXITED",        // Vehicle exited
};

export default function Parking() {
  const [step, setStep] = useState(STEP.FORM);
  const [parkData, setParkData] = useState(null);
  const [exitData, setExitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const sessionId = getSessionId();

  // ─── Park a vehicle ──────────────────────────────────────
  const handlePark = useCallback(async (vehicleNumber, vehicleType) => {
    setLoading(true);
    try {
      const res = await parkVehicle(vehicleNumber, vehicleType);
      const data = res.data;

      if (data.data.status === "PARKED") {
        setParkData(data.data);
        setStep(STEP.PARKED);
        addToast(`✅ Slot ${data.data.slotId} assigned to ${vehicleNumber}!`, "success");
      } else if (data.data.status === "WAITING") {
        setParkData(data.data);
        setStep(STEP.QUEUED);
        addToast(`⏳ No slots available. Added to queue at position #${data.data.queuePosition}.`, "warning");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleRemember = async () => {
    try {
      await rememberParkingLocation(sessionId, parkData.vehicleNumber);
      addToast("🚗 Car Parked Successfully. Your location is saved.", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Could not save your parking location.", "error");
    }
  };

  // ─── Exit a vehicle ──────────────────────────────────────
  const handleExit = useCallback(async () => {
    if (!parkData?.vehicleNumber) return;
    setLoading(true);
    try {
      const res = await exitVehicle(parkData.vehicleNumber);
      const data = res.data.data;
      setExitData(data);
      setStep(STEP.EXITED);

      if (data.assignedQueueVehicle) {
        addToast(
          `🔄 Slot ${data.freedSlot} assigned to queued vehicle ${data.assignedQueueVehicle.vehicleNumber}`,
          "info"
        );
      } else {
        addToast(`✅ Vehicle exited. Slot ${data.freedSlot} is now available.`, "success");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Exit failed. Please try again.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [parkData, addToast]);

  // ─── Reset flow ──────────────────────────────────────────
  const reset = () => {
    setStep(STEP.FORM);
    setParkData(null);
    setExitData(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ParkingCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Find Parking</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Enter your vehicle number to find an available slot
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { label: "Enter", s: STEP.FORM },
          { label: "Assign", s: STEP.PARKED },
          { label: "Navigate", s: STEP.NAV_TO_SLOT },
          { label: "Exit", s: STEP.NAV_TO_EXIT },
          { label: "Done", s: STEP.EXITED },
        ].map(({ label, s }, i) => {
          const steps = [STEP.FORM, STEP.PARKED, STEP.NAV_TO_SLOT, STEP.NAV_TO_EXIT, STEP.EXITED];
          const currentIdx = steps.indexOf(step);
          const thisIdx = steps.indexOf(s);
          const active = step === s;
          const done = currentIdx > thisIdx;
          return (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${active ? "bg-emerald-500 text-white" : done ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}
              >
                {done ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < 4 && <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ── STEP: FORM ──────────────────────────────────── */}
      {step === STEP.FORM && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 animate-fade-in">
          <h2 className="text-white font-semibold mb-5">Vehicle Details</h2>
          <VehicleForm onSubmit={handlePark} loading={loading} />
        </div>
      )}

      {/* ── STEP: PARKED (Slot assigned) ─────────────────── */}
      {step === STEP.PARKED && parkData && (
        <div className="space-y-4 animate-fade-in">
          {/* Success card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-white font-bold text-xl mb-1">Car Parked Successfully</h2>
            <p className="text-slate-400 text-sm mb-4">Your vehicle has been assigned</p>

            {/* Slot badge */}
            <div className="inline-flex items-center gap-3 bg-slate-900/60 rounded-2xl px-8 py-5 mb-4">
              <div className="text-center">
                <div className="text-5xl font-black text-emerald-400">{parkData.slotId}</div>
                <div className="text-slate-500 text-xs mt-1">Parking Slot</div>
              </div>
            </div>

            <div className="space-y-1 text-sm text-slate-400">
              <p><span className="text-slate-500">Vehicle:</span> <span className="text-white font-semibold">{parkData.vehicleNumber}</span></p>
              <p><span className="text-slate-500">Type:</span> {parkData.vehicleType}</p>
              <p><span className="text-slate-500">Entry:</span> {new Date(parkData.entryTime).toLocaleTimeString()}</p>
              <p><span className="text-slate-500">Location:</span> {parkData.location?.level || "Level 1"} → {parkData.location?.zone || `Zone ${parkData.slotId.charAt(0)}`} → {parkData.slotId}</p>
            </div>
          </div>

          <button onClick={handleRemember} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all">
            📍 Remember My Car
          </button>

          {/* Action buttons */}
          <button
            onClick={() => setStep(STEP.NAV_TO_SLOT)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-all shadow-lg shadow-blue-500/25"
          >
            <Navigation className="w-4 h-4" />
            Navigate to Slot
          </button>

          <button
            onClick={() => setStep(STEP.NAV_TO_EXIT)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Navigate to Exit
          </button>

          <button
            onClick={handleExit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-medium transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            Exit Parking
          </button>
        </div>
      )}

      {/* ── STEP: QUEUED ─────────────────────────────────── */}
      {step === STEP.QUEUED && parkData && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
            <Clock className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h2 className="text-white font-bold text-xl mb-1">Added to Waiting Queue</h2>
            <p className="text-slate-400 text-sm mb-4">
              No parking slots are currently available.
              <br />
              Your vehicle has been added to the waiting queue.
            </p>

            <div className="inline-flex items-center gap-3 bg-slate-900/60 rounded-2xl px-8 py-5 mb-4">
              <div className="text-center">
                <div className="text-5xl font-black text-orange-400">#{parkData.queuePosition}</div>
                <div className="text-slate-500 text-xs mt-1">Queue Position</div>
              </div>
            </div>

            <div className="space-y-1 text-sm text-slate-400">
              <p><span className="text-slate-500">Vehicle:</span> <span className="text-white font-semibold">{parkData.vehicleNumber}</span></p>
              <p className="text-slate-500 text-xs mt-2">
                You will be automatically assigned a slot when one becomes available (FIFO order).
              </p>
            </div>
          </div>

          {/* Queue list preview */}
          {parkData.queue && parkData.queue.length > 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Current Queue
              </h3>
              <div className="space-y-2">
                {parkData.queue.map((v, i) => (
                  <div
                    key={v.vehicleNumber}
                    className={`flex items-center gap-3 p-2.5 rounded-lg ${
                      v.vehicleNumber === parkData.vehicleNumber
                        ? "bg-orange-500/10 border border-orange-500/20"
                        : "bg-slate-800/50"
                    }`}
                  >
                    <span className="text-orange-400 text-xs font-bold w-5">#{i + 1}</span>
                    <span className={`text-sm font-medium ${v.vehicleNumber === parkData.vehicleNumber ? "text-orange-300" : "text-slate-300"}`}>
                      {v.vehicleNumber}
                    </span>
                    {v.vehicleNumber === parkData.vehicleNumber && (
                      <span className="ml-auto text-xs text-orange-400 font-medium">← You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-medium transition-all"
          >
            Park Another Vehicle
          </button>
        </div>
      )}

      {/* ── STEP: NAVIGATE TO SLOT ──────────────────────── */}
      {step === STEP.NAV_TO_SLOT && parkData && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              Navigate to Slot {parkData.slotId}
            </h2>
            <button
              onClick={() => setStep(STEP.PARKED)}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Back
            </button>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <MapView slotId={parkData.slotId} mode="to-slot" />
          </div>

          <button
            onClick={() => setStep(STEP.PARKED)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all"
          >
            ✅ I've Parked — Back to Options
          </button>
        </div>
      )}

      {/* ── STEP: NAVIGATE TO EXIT ───────────────────────── */}
      {step === STEP.NAV_TO_EXIT && parkData && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <LogOut className="w-4 h-4 text-orange-400" />
              Navigate to Exit from {parkData.slotId}
            </h2>
            <button
              onClick={() => setStep(STEP.PARKED)}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Back
            </button>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <MapView slotId={parkData.slotId} mode="to-exit" />
          </div>

          <button
            onClick={handleExit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold transition-all shadow-lg shadow-red-500/25 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Exit Parking — Free My Slot
          </button>
        </div>
      )}

      {/* ── STEP: EXITED ─────────────────────────────────── */}
      {step === STEP.EXITED && exitData && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-2xl border border-slate-700/30 bg-slate-800/30 p-6 text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-white font-bold text-xl mb-1">Safe Travels!</h2>
            <p className="text-slate-400 text-sm mb-4">
              Vehicle has successfully exited the parking lot.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-emerald-400 font-bold text-lg">{exitData.freedSlot}</div>
                <div className="text-slate-500 text-xs">Freed Slot</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-blue-400 font-bold text-lg">{exitData.duration}m</div>
                <div className="text-slate-500 text-xs">Duration</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-purple-400 font-bold text-lg">{exitData.remainingQueue}</div>
                <div className="text-slate-500 text-xs">In Queue</div>
              </div>
            </div>

            {exitData.assignedQueueVehicle && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                🔄 Slot {exitData.freedSlot} auto-assigned to queued vehicle{" "}
                <strong>{exitData.assignedQueueVehicle.vehicleNumber}</strong>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all"
          >
            Park Another Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
