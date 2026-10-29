import { useEffect, useState } from "react";
import { Bell, CheckCircle, Loader2, Smartphone } from "lucide-react";
import { fetchNotificationPreferences, fetchSlots, savePushSubscription, updateNotificationPreferences } from "../api/parkingApi";
import { enablePushNotifications, getSessionId } from "../api/session";

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({ availabilityEnabled: true, carReminderEnabled: true, preferredSlot: "ANY" });
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  useEffect(() => {
    Promise.all([fetchNotificationPreferences(sessionId), fetchSlots()])
      .then(([preferencesRes, slotsRes]) => { setPreferences(preferencesRes.data.data); setSlots(slotsRes.data.data); })
      .catch(() => setStatus("Could not load notification settings."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const update = async (changes) => {
    const next = { ...preferences, ...changes };
    setPreferences(next);
    try { await updateNotificationPreferences(sessionId, next); setStatus("Settings saved."); }
    catch { setStatus("Could not save settings."); }
  };

  const enablePush = async () => {
    setStatus("Requesting browser notification permission...");
    try { await enablePushNotifications((subscription) => savePushSubscription(sessionId, subscription)); setStatus("Background notifications enabled."); }
    catch (err) { setStatus(err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1"><div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><Bell className="w-5 h-5 text-emerald-400" /></div><h1 className="text-2xl font-bold text-white">Notification Settings</h1></div>
      <p className="text-slate-500 text-sm ml-12 mb-8">Choose how this browser keeps you informed.</p>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 divide-y divide-slate-700/50">
        <label className="flex items-center justify-between gap-4 p-5 cursor-pointer"><div><p className="text-white font-medium">Parking availability</p><p className="text-slate-500 text-xs mt-1">Notify me when a watched slot becomes available.</p></div><input type="checkbox" checked={preferences.availabilityEnabled} onChange={(e) => update({ availabilityEnabled: e.target.checked })} className="w-5 h-5 accent-emerald-500" /></label>
        <label className="flex items-center justify-between gap-4 p-5 cursor-pointer"><div><p className="text-white font-medium">Find My Car reminders</p><p className="text-slate-500 text-xs mt-1">Keep saved parking reminders enabled.</p></div><input type="checkbox" checked={preferences.carReminderEnabled} onChange={(e) => update({ carReminderEnabled: e.target.checked })} className="w-5 h-5 accent-emerald-500" /></label>
        <label className="flex items-center justify-between gap-4 p-5"><div><p className="text-white font-medium">Preferred slot</p><p className="text-slate-500 text-xs mt-1">Used when choosing a slot to watch.</p></div><select value={preferences.preferredSlot} onChange={(e) => update({ preferredSlot: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"><option value="ANY">Any Slot</option>{slots.map((slot) => <option key={slot.slotId} value={slot.slotId}>{slot.slotId}</option>)}</select></label>
      </div>
      <button onClick={enablePush} className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold"><Smartphone className="w-4 h-4" /> Enable background browser notifications</button>
      {status && <p className="mt-4 flex items-center gap-2 text-slate-400 text-sm"><CheckCircle className="w-4 h-4 text-emerald-400" />{status}</p>}
      <p className="text-slate-600 text-xs mt-5">Background push requires HTTPS, deployed backend VAPID keys, and a browser that supports Web Push. In-app notifications use the backend status endpoint while this app is open.</p>
    </div>
  );
}
