// frontend/src/pages/Dashboard.jsx
// Admin-style dashboard showing all stats, grid, queue, and activity

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, RefreshCw, ParkingCircle, Car,
  Shield, Users, Database, Loader2
} from "lucide-react";
import StatCard from "../components/StatCard";
import ParkingGrid from "../components/ParkingGrid";
import QueuePanel from "../components/QueuePanel";
import ActivityStack from "../components/ActivityStack";
import { fetchSlots, fetchStats, fetchNotifications, waitForSlot } from "../api/parkingApi";
import { getSessionId } from "../api/session";
import { ToastContainer, useToast } from "../components/Toast";

export default function Dashboard() {
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const { toasts, addToast, removeToast } = useToast();
  const sessionId = getSessionId();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, statsRes, notificationRes] = await Promise.all([
        fetchSlots(),
        fetchStats(),
        fetchNotifications(sessionId),
      ]);
      setSlots(slotsRes.data.data);
      setStats(statsRes.data.data);
      setNotification(notificationRes.data.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleNotify = async (slot) => {
    try {
      const response = await waitForSlot(sessionId, slot.slotId);
      addToast(response.data.message, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Could not register the slot notification.", "error");
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {notification?.type === "SLOT_AVAILABLE" && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
          <span className="text-xl">🔔</span>
          <div>
            <h2 className="text-white font-semibold">{notification.title}</h2>
            <p className="text-emerald-300 text-sm">{notification.message} {notification.level} • {notification.zone}</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Parking Dashboard</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Live overview · Auto-refreshes every 15s ·{" "}
            <span className="text-slate-600">
              Last: {lastRefresh.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Data source status */}
      <div className="mb-6 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
        <Database className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-blue-300 text-sm font-semibold">Data Source: System Database</p>
          <p className="text-blue-400/80 text-xs mt-0.5">
            Slot statuses are managed by this application. No physical parking sensors or external API is connected.
            Park or exit vehicles via the Parking page to update slot status.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total"     value={stats.total}     icon={Database}       color="blue"   />
        <StatCard label="Available" value={stats.available} icon={ParkingCircle}  color="emerald"/>
        <StatCard label="Occupied"  value={stats.occupied}  icon={Car}            color="red"    />
        <StatCard label="Reserved"  value={stats.reserved}  icon={Shield}         color="yellow" />
        <StatCard label="Waiting"   value={stats.waiting}   icon={Users}          color="purple" />
      </div>

      {loading && slots.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Parking Grid — takes 2/3 width */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <ParkingCircle className="w-4 h-4 text-emerald-400" />
              Parking Layout
            </h2>
            <ParkingGrid slots={slots} onNotify={handleNotify} />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <QueuePanel queue={stats.queue || []} />
            <ActivityStack activities={stats.recentActivity || []} />
          </div>
        </div>
      )}
    </div>
  );
}
