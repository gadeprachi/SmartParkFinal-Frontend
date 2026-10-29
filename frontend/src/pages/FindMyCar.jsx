import { useEffect, useState } from "react";
import { Bell, Car, Loader2, MapPin, Navigation, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import MapView from "../components/MapView";
import { fetchNotifications, fetchSavedParkingLocation } from "../api/parkingApi";
import { getSessionId } from "../api/session";

export default function FindMyCar() {
  const [saved, setSaved] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  useEffect(() => {
    const load = async () => {
      try {
        const [savedRes, notificationRes] = await Promise.all([
          fetchSavedParkingLocation(sessionId),
          fetchNotifications(sessionId),
        ]);
        setSaved(savedRes.data.data);
        setNotification(notificationRes.data.data);
      } catch (err) {
        console.error("Find My Car load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Find My Car</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">Your saved parking location and directions</p>
        </div>
        <Link to="/settings" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white" title="Notification settings">
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {notification?.type === "SLOT_AVAILABLE" && (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div><h2 className="text-white font-semibold">{notification.title}</h2><p className="text-emerald-300 text-sm">{notification.message} {notification.level} • {notification.zone}</p></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
      ) : !saved ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
          <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-white font-semibold mb-2">No saved car yet</h2>
          <p className="text-slate-500 text-sm mb-5">Remember your car after a parking slot is assigned.</p>
          <Link to="/parking" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold">Find Parking</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-5"><Car className="w-4 h-4" /> Saved parking location</div>
            <p className="text-white text-lg font-bold mb-1">{saved.vehicleNumber}</p>
            <p className="text-slate-300 mb-4">{saved.mallName}</p>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-slate-500 text-xs">Level</p><p className="text-white font-semibold">{saved.level}</p></div>
              <div><p className="text-slate-500 text-xs">Zone</p><p className="text-white font-semibold">{saved.zone}</p></div>
              <div><p className="text-slate-500 text-xs">Slot</p><p className="text-blue-400 font-black text-xl">{saved.slotId}</p></div>
            </div>
            <p className="text-slate-500 text-xs mt-5">Parked {new Date(saved.parkedAt).toLocaleString()}</p>
          </div>
          <button onClick={() => setShowMap(!showMap)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold"><Navigation className="w-4 h-4" />{showMap ? "Hide Navigation" : "Navigate to My Car"}</button>
          {showMap && <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4"><p className="text-yellow-300 text-xs mb-3">GPS can guide you to the parking area. Indoor level, zone, and slot details above are the precise car location.</p><MapView slotId={saved.slotId} mode="to-slot" /></div>}
        </div>
      )}
    </div>
  );
}
