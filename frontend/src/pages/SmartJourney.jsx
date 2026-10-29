// frontend/src/pages/SmartJourney.jsx
// SMART JOURNEY — Real GPS Journey Tracking & Parking Alerts
// Demo mode completely removed. Uses real browser Geolocation API.
// No fake data, no simulated GPS, no ETA override, no demo trigger button.
// ROUTING NOTE: Uses Haversine straight-line distance (no API key needed).
// For real road routing set VITE_ROUTING_API_URL in frontend/.env

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Navigation, Bell, Play, Square,
  MapPin, Clock, Car, AlertCircle, CheckCircle,
  RefreshCw, Volume2, VolumeX, Wifi, WifiOff,
  ChevronDown, ChevronUp, Database, ParkingCircle, AlertTriangle,
  X, ExternalLink
} from "lucide-react";
import MapView from "../components/MapView";
import { fetchAvailability } from "../api/parkingApi";

// Parking facility config (matches MapView.jsx - illustrative coordinates only)
const FACILITY = {
  name: "SmartPark Demo Facility",
  entranceLat: 18.5209,
  entranceLng: 73.8567,
};

// DSA: Haversine formula - O(1) straight-line distance between two GPS points
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// DSA: Rank zones by availability - Linear scan O(n)
function rankZones(zones) {
  return [...zones].sort((a, b) => {
    if (b.available !== a.available) return b.available - a.available;
    return b.total - a.total;
  });
}

// Build alert checkpoints before arrival (minutes)
function buildAlertSchedule(etaMinutes, thresholdMin) {
  const checkpoints = [thresholdMin, Math.round(thresholdMin / 2)].filter(
    (t) => t > 0 && t < etaMinutes
  );
  return [...new Set(checkpoints)].sort((a, b) => b - a);
}

// Web Speech API helper
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

// Browser Notifications API helper
function sendBrowserNotif(title, body) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

// Returns honest data-source label for display
function getDataSourceLabel(availability) {
  if (!availability) return null;
  if (availability.dataSource === "none") {
    return { text: "No parking data source connected", color: "text-slate-500", dot: "bg-slate-600" };
  }
  if (availability.dataMode === "manual") {
    return { text: "Manual data — entered by operator", color: "text-yellow-400", dot: "bg-yellow-500" };
  }
  if (availability.dataMode === "test") {
    return { text: "Test data — development use only", color: "text-purple-400", dot: "bg-purple-500 animate-pulse" };
  }
  return {
    text: "System database — slots managed by this application (not physical sensors)",
    color: "text-blue-400",
    dot: "bg-blue-500",
  };
}

export default function SmartJourney() {
  // Form state
  const [destination, setDestination] = useState("SmartPark Demo Facility");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [pollIntervalSec, setPollIntervalSec] = useState(30);
  const [alertThresholdMin, setAlertThresholdMin] = useState(10);
  const [notifPref, setNotifPref] = useState("both");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Journey state
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyStartedAt, setJourneyStartedAt] = useState(null);

  // Location state - real GPS only, no simulated fallback
  const [userLocation, setUserLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsWatching, setGpsWatching] = useState(false);
  const watchIdRef = useRef(null);

  // ETA state
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [etaMode, setEtaMode] = useState("scheduled"); // "scheduled" | "gps"

  // Availability state
  const [availability, setAvailability] = useState(null);
  const [availError, setAvailError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Alert / notification state
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [alertsTriggered, setAlertsTriggered] = useState(new Set());
  const [lastAlert, setLastAlert] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [alertSchedule, setAlertSchedule] = useState([]);

  // Map state
  const [showMap, setShowMap] = useState(false);
  const [mapMode, setMapMode] = useState("to-slot");

  // Popup notification state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const lastPopupKeyRef = useRef(null);
  const autoDismissRef = useRef(null);

  const pollTimerRef = useRef(null);

  // Set default departure/arrival times
  useEffect(() => {
    const now = new Date();
    const arr = new Date(now.getTime() + 60 * 60 * 1000);
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setDepartureTime(fmt(now));
    setArrivalTime(fmt(arr));
  }, []);

  // Fetch availability from backend
  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    setAvailError(null);
    try {
      const res = await fetchAvailability();
      const data = res.data.data;
      setAvailability(data);
      setLastChecked(new Date());
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || "Could not reach parking server. Check your network connection.";
      setAvailError(msg);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Compute ETA: real GPS first, then scheduled arrival time
  const computeETA = useCallback(() => {
    if (userLocation) {
      const km = haversineKm(userLocation, { lat: FACILITY.entranceLat, lng: FACILITY.entranceLng });
      setDistanceKm(km);
      const estimatedMin = Math.round((km / 30) * 60);
      setEtaMinutes(estimatedMin);
      setEtaMode("gps");
      return estimatedMin;
    }
    if (arrivalTime) {
      const diff = Math.round((new Date(arrivalTime) - Date.now()) / 60000);
      const clamped = Math.max(0, diff);
      setEtaMinutes(clamped);
      setEtaMode("scheduled");
      return clamped;
    }
    return null;
  }, [userLocation, arrivalTime]);

  // Show popup immediately with current availability data (fires on journey start & data change)
  const showPopupNow = useCallback((avail, eta) => {
    if (!avail || avail.dataSource === 'none') return;
    const ranked = avail.byZone
      ? [...avail.byZone].sort((a, b) => b.available - a.available || b.total - a.total)
      : [];
    const best = ranked[0] ?? null;
    const dataLabel =
      avail.dataMode === 'manual' ? ' [Manual data]'
      : avail.dataMode === 'test' ? ' [Test data]'
      : ' [System DB]';
    const popupKey = `journey-${avail.available}-${avail.occupied}-${best?.zone ?? 'none'}`;
    if (lastPopupKeyRef.current === popupKey) return; // no change
    lastPopupKeyRef.current = popupKey;
    // Clear any existing auto-dismiss timer
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setPopupData({
      type: avail.available > 0 ? 'available' : 'full',
      location: avail.facility?.name || destination || 'SmartPark Facility',
      zone: best?.zone ?? null,
      available: avail.available,
      occupied: avail.occupied,
      total: avail.total,
      eta: eta,
      dataLabel,
      checkedAt: new Date(),
    });
    setPopupVisible(true);
    // Auto-dismiss after 8 seconds
    autoDismissRef.current = setTimeout(() => setPopupVisible(false), 8000);
  }, [destination]);

  // Alert logic - only fires with genuine data
  const maybeAlert = useCallback(
    (avail, eta) => {
      if (!avail || eta === null || !journeyActive) return;
      if (avail.dataSource === "none") return; // No data source = no alert
      const triggerable = alertSchedule.filter((t) => eta <= t && !alertsTriggered.has(t));
      if (triggerable.length === 0) return;
      const checkpoint = triggerable[0];
      const dataLabel =
        avail.dataMode === "manual" ? " [Manual data]" :
        avail.dataMode === "test" ? " [Test data]" : " [System DB]";
      const title = avail.available > 0
        ? `SmartPark Alert - ${avail.facility?.name || "Parking"}`
        : `SmartPark - Parking Full`;
      const body = avail.available > 0
        ? `${avail.available} of ${avail.total} spaces available.${dataLabel} ~${eta} min to arrival. Verify before entering.`
        : `No spaces available (${avail.occupied}/${avail.total} occupied).${dataLabel} ~${eta} min to arrival.`;
      setLastAlert({ title, body, type: avail.available > 0 ? "available" : "full", at: new Date(), checkpoint });
      setAlertsTriggered((prev) => new Set([...prev, checkpoint]));
      if (notifPref !== "voice") sendBrowserNotif(title, body);
      if ((notifPref === "voice" || notifPref === "both") && voiceEnabled) speak(`${title}. ${body}`);
      // Show in-page popup (checkpoint alert overrides auto-dismiss)
      showPopupNow(avail, eta);
    },
    [journeyActive, alertSchedule, alertsTriggered, notifPref, voiceEnabled, showPopupNow]
  );

  const runPoll = useCallback(async () => {
    const avail = await checkAvailability();
    const eta = computeETA();
    maybeAlert(avail, eta);
  }, [checkAvailability, computeETA, maybeAlert]);

  // Start real GPS watching
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Browser geolocation not supported. ETA uses scheduled arrival time.");
      return;
    }
    setGpsWatching(true);
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
      },
      (err) => {
        const msg = err.code === 1
          ? "GPS permission denied. ETA calculated from scheduled arrival time."
          : "GPS temporarily unavailable. ETA calculated from scheduled arrival time.";
        setGpsError(msg);
        setGpsWatching(false);
        setUserLocation(null); // Clear stale location
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsWatching(false);
  }, []);

  const startJourney = useCallback(async () => {
    if (!destination.trim()) return;
    setJourneyActive(true);
    setJourneyStartedAt(new Date());
    setAlertsTriggered(new Set());
    setLastAlert(null);
    const initialEta = computeETA();
    setAlertSchedule(buildAlertSchedule(initialEta ?? 60, alertThresholdMin));
    startGPS();
    const firstAvail = await checkAvailability();
    const firstEta = computeETA();
    showPopupNow(firstAvail, firstEta); // Show immediately on journey start
    maybeAlert(firstAvail, firstEta);
    pollTimerRef.current = setInterval(() => runPoll(), pollIntervalSec * 1000);
  }, [destination, computeETA, alertThresholdMin, startGPS, runPoll, checkAvailability, showPopupNow, maybeAlert, pollIntervalSec]);

  const stopJourney = useCallback(() => {
    setJourneyActive(false);
    stopGPS();
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [stopGPS]);

  useEffect(() => { return () => { stopJourney(); }; }, [stopJourney]);

  useEffect(() => {
    if (!journeyActive) return;
    const eta = computeETA();
    if (availability) {
      showPopupNow(availability, eta); // Update popup when data changes
      maybeAlert(availability, eta);
    }
  }, [userLocation, journeyActive, computeETA, availability, maybeAlert, showPopupNow]);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const rankedZones = availability?.byZone ? rankZones(availability.byZone) : [];
  const bestZone = rankedZones[0];
  const dataSourceInfo = getDataSourceLabel(availability);

  const etaDisplay = etaMinutes !== null
    ? etaMode === "gps"
      ? `~${etaMinutes} min (GPS, straight-line ~${distanceKm?.toFixed(1)} km)`
      : `~${etaMinutes} min (scheduled arrival time)`
    : "-";

  const availBorderColor = availability
    ? availability.dataSource === "none"
      ? "border-slate-700/50 bg-slate-800/30"
      : availability.available > 0
        ? "border-emerald-500/40 bg-emerald-500/10"
        : "border-red-500/40 bg-red-500/10"
    : "border-slate-700/50 bg-slate-800/30";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Navigation className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Journey</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Travel to your destination and get automatic parking alerts without opening the app.
        </p>
      </div>


      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: Journey Planner */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" /> Plan Your Journey
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Destination</label>
                <input id="sj-destination" type="text" value={destination}
                  onChange={(e) => setDestination(e.target.value)} disabled={journeyActive}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  placeholder="e.g. SmartPark Demo Facility" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Departure Time</label>
                <input id="sj-departure" type="datetime-local" value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)} disabled={journeyActive}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Expected Arrival Time</label>
                <input id="sj-arrival" type="datetime-local" value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)} disabled={journeyActive}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
                <p className="text-slate-600 text-xs mt-1">Used for ETA when GPS is unavailable or denied.</p>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Alert Method</label>
                <select id="sj-notif-pref" value={notifPref} onChange={(e) => setNotifPref(e.target.value)}
                  disabled={journeyActive}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50">
                  <option value="both">Browser notification + Voice</option>
                  <option value="browser">Browser notification only</option>
                  <option value="voice">Voice / Text-to-speech only</option>
                </select>
              </div>
              <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Advanced settings
              </button>
              {showAdvanced && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Polling interval: {pollIntervalSec}s</label>
                    <input type="range" min={10} max={120} step={5} value={pollIntervalSec}
                      onChange={(e) => setPollIntervalSec(Number(e.target.value))} disabled={journeyActive}
                      className="w-full accent-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Alert threshold: {alertThresholdMin} min before arrival</label>
                    <input type="range" min={5} max={30} step={5} value={alertThresholdMin}
                      onChange={(e) => setAlertThresholdMin(Number(e.target.value))} disabled={journeyActive}
                      className="w-full accent-blue-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification permission */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 flex items-start gap-3">
            <Bell className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm font-medium">Browser Notifications</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {notifPermission === "granted" && "Granted — browser alerts enabled."}
                {notifPermission === "denied" && "Denied — only voice/in-app alerts work."}
                {notifPermission === "default" && "Not yet requested — click Enable."}
                {notifPermission === "unsupported" && "Not supported in this browser."}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Alerts require this tab to remain open. Background push requires HTTPS plus VAPID keys.
              </p>
            </div>
            {notifPermission === "default" && (
              <button onClick={requestNotifPermission}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors">
                Enable
              </button>
            )}
          </div>

          {/* Start / Stop */}
          <div className="flex gap-3">
            {!journeyActive ? (
              <button id="sj-start" onClick={startJourney} disabled={!destination.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/25">
                <Play className="w-4 h-4" /> Start Journey
              </button>
            ) : (
              <button id="sj-stop" onClick={stopJourney}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 font-semibold transition-all">
                <Square className="w-4 h-4" /> Stop Journey
              </button>
            )}
            <button onClick={() => setVoiceEnabled((v) => !v)}
              title={voiceEnabled ? "Mute voice" : "Enable voice"}
              className={`px-4 py-3.5 rounded-xl border font-medium text-sm transition-all ${voiceEnabled ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* GPS Status */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-4">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">GPS Status</p>
            {!journeyActive && <p className="text-slate-500 text-xs">GPS activates when you start the journey.</p>}
            {journeyActive && gpsWatching && !gpsError && (
              <div className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-emerald-400 text-xs">GPS active - receiving real location from your device.</p>
              </div>
            )}
            {journeyActive && !gpsWatching && !gpsError && (
              <div className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-slate-500 text-xs">Requesting GPS permission...</p>
              </div>
            )}
            {gpsError && (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-yellow-400 text-xs">{gpsError}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live Status */}
        <div className="space-y-4">
          {/* Journey status */}
          <div className={`rounded-2xl border p-5 transition-all ${journeyActive ? "border-blue-500/40 bg-blue-500/10" : "border-slate-700/50 bg-slate-800/30"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${journeyActive ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
                {journeyActive ? "Journey Active" : "Journey Idle"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs">
                {gpsWatching ? (
                  <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">GPS Live</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 text-slate-500" /><span className="text-slate-500">GPS Off</span></>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> ETA</p>
                <p className="text-white text-sm font-semibold">{etaDisplay}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Destination</p>
                <p className="text-white text-sm font-semibold truncate" title={destination}>{destination || "-"}</p>
              </div>
              {journeyStartedAt && (
                <div className="bg-slate-900/50 rounded-xl p-3 col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Journey started</p>
                  <p className="text-blue-300 text-sm font-medium">{journeyStartedAt.toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Availability */}
          <div id="parking-availability" className={`rounded-2xl border p-5 transition-all ${availBorderColor}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <ParkingCircle className="w-4 h-4 text-emerald-400" /> Parking Availability
              </h2>
              <div className="flex items-center gap-2">
                {lastChecked && <span className="text-slate-500 text-xs">{lastChecked.toLocaleTimeString()}</span>}
                <button onClick={() => checkAvailability()} disabled={isChecking}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 transition-colors" title="Refresh">
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            {availError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-xs">{availError}</p>
              </div>
            )}
            {availability ? (
              <>
                {dataSourceInfo && (
                  <div className="flex items-center gap-1.5 mb-4 p-2.5 rounded-lg bg-slate-900/50">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dataSourceInfo.dot}`} />
                    <span className={`text-xs ${dataSourceInfo.color}`}>{dataSourceInfo.text}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center bg-slate-900/50 rounded-xl p-3">
                    <div className="text-emerald-400 font-black text-2xl">{availability.available}</div>
                    <div className="text-slate-500 text-xs mt-0.5">Available</div>
                  </div>
                  <div className="text-center bg-slate-900/50 rounded-xl p-3">
                    <div className="text-red-400 font-black text-2xl">{availability.occupied}</div>
                    <div className="text-slate-500 text-xs mt-0.5">Occupied</div>
                  </div>
                  <div className="text-center bg-slate-900/50 rounded-xl p-3">
                    <div className="text-white font-black text-2xl">{availability.total}</div>
                    <div className="text-slate-500 text-xs mt-0.5">Total</div>
                  </div>
                </div>
                {availability.lastUpdated && (
                  <p className="text-slate-600 text-xs mb-3">Last updated: {new Date(availability.lastUpdated).toLocaleTimeString()}</p>
                )}
                {rankedZones.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Zone Ranking (Best First)</p>
                    <div className="space-y-2">
                      {rankedZones.map((z, i) => (
                        <div key={z.zone} className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm ${i === 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-700/40 bg-slate-900/30"}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}>{z.zone}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-medium">Zone {z.zone}</span>
                              {i === 0 && z.available > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 font-medium">Recommended</span>
                              )}
                            </div>
                            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="text-emerald-400">{z.available} free</span>
                              <span>{z.occupied} occupied</span>
                              <span className="text-slate-600">/ {z.total} total</span>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${z.available > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bestZone && (
                  <div className={`mt-3 p-3 rounded-xl border text-sm ${bestZone.available > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                    {bestZone.available > 0 ? (
                      <>
                        <p className="font-semibold mb-0.5">Recommended: Zone {bestZone.zone}</p>
                        <p className="text-xs opacity-80">{bestZone.available} slot{bestZone.available !== 1 ? "s" : ""} available in this system. Availability may change before arrival.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold mb-0.5">Facility Currently Full</p>
                        <p className="text-xs opacity-80">All {availability.total} slots occupied. May change before arrival.</p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">{journeyActive ? "Fetching availability..." : "Start journey to check availability."}</p>
              </div>
            )}
          </div>

          {/* Last alert */}
          {lastAlert && (
            <div className={`rounded-2xl border p-4 ${lastAlert.type === "available" ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
              <div className="flex items-start gap-3">
                {lastAlert.type === "available"
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-white text-sm font-semibold">{lastAlert.title}</p>
                  <p className="text-slate-400 text-xs mt-1">{lastAlert.body}</p>
                  <p className="text-slate-600 text-xs mt-1">Alert sent at {lastAlert.at.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Map navigation */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" /> Navigate to Parking Entrance
            </h2>
            <p className="text-slate-500 text-xs mb-3">
              Shows your real GPS location (when granted) and the illustrative route to the demo facility entrance.
            </p>
            <button onClick={() => setShowMap((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-400 font-medium text-sm transition-all">
              <MapPin className="w-4 h-4" /> {showMap ? "Hide Map" : "Show Route to Entrance"}
            </button>
            {showMap && (
              <div className="mt-3">
                <div className="flex gap-2 mb-3">
                  {["to-slot", "to-exit"].map((m) => (
                    <button key={m} onClick={() => setMapMode(m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mapMode === m ? "bg-blue-500 text-white" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"}`}>
                      {m === "to-slot" ? "To Entrance / Slot" : "To Exit"}
                    </button>
                  ))}
                </div>
                <MapView slotId={bestZone ? `${bestZone.zone}1` : "A1"} mode={mapMode} />
                <p className="text-slate-600 text-xs mt-2">Slot shown is illustrative. Indoor GPS navigation is not supported.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert schedule */}
      {journeyActive && alertSchedule.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl border border-slate-700/50 bg-slate-800/20">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Scheduled Alert Checkpoints</p>
          <div className="flex flex-wrap gap-2">
            {alertSchedule.map((t) => (
              <span key={t} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${alertsTriggered.has(t) ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 line-through" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                {alertsTriggered.has(t) ? "Done" : "Pending"} ~{t} min before arrival
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-2">Polling every {pollIntervalSec}s. Each checkpoint fires once only to prevent duplicates.</p>
        </div>
      )}

      {/* ETA note */}
      <div className="mt-6 p-4 rounded-2xl border border-slate-700/30 bg-slate-800/20">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> ETA Accuracy Note
        </p>
        <p className="text-slate-600 text-xs">
          ETA uses straight-line Haversine distance at ~30 km/h assumed city speed.
          Actual road distance is typically 20-40% longer. For real road routing,
          connect OSRM, Mapbox, or Google Maps via VITE_ROUTING_API_URL in your frontend .env file.
        </p>
      </div>

      {/* ── Parking Availability Popup ─────────────────────────────── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        .popup-enter { animation: slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {popupVisible && popupData && (
        <div
          className="popup-enter fixed bottom-6 right-6 z-50 w-84 max-w-xs rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(20,30,55,0.98) 100%)",
            border: `1px solid ${popupData.type === "available" ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"}`,
            boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px ${popupData.type === "available" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)"}`,
          }}
        >
          {/* Coloured top bar */}
          <div
            className="h-1 w-full"
            style={{
              background: popupData.type === "available"
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />

          <div className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    popupData.type === "available" ? "bg-emerald-500/15" : "bg-red-500/15"
                  }`}
                >
                  <Car
                    className={`w-4 h-4 ${
                      popupData.type === "available" ? "text-emerald-400" : "text-red-400"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold leading-tight">
                    Parking Availability for Your Vehicle
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{popupData.location}</p>
                </div>
              </div>
              <button
                onClick={() => { setPopupVisible(false); if (autoDismissRef.current) clearTimeout(autoDismissRef.current); }}
                className="shrink-0 ml-2 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Total */}
              <div className="bg-slate-800/70 rounded-xl px-2 py-2.5 text-center">
                <p className="text-white font-black text-xl leading-none">{popupData.total ?? "—"}</p>
                <p className="text-slate-500 text-xs mt-1">Total</p>
              </div>
              {/* Available */}
              <div
                className={`rounded-xl px-2 py-2.5 text-center ${
                  popupData.available > 0 ? "bg-emerald-500/15" : "bg-red-500/10"
                }`}
              >
                <p
                  className={`font-black text-xl leading-none ${
                    popupData.available > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {popupData.available}
                </p>
                <p className="text-slate-500 text-xs mt-1">Available</p>
              </div>
              {/* Occupied */}
              <div className="bg-slate-800/70 rounded-xl px-2 py-2.5 text-center">
                <p className="text-red-400 font-black text-xl leading-none">{popupData.occupied ?? "—"}</p>
                <p className="text-slate-500 text-xs mt-1">Occupied</p>
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${
                popupData.available > 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
                  popupData.available > 0 ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  popupData.available > 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {popupData.available > 0 ? "Parking Available" : "Parking Full"}
              </span>
              {popupData.zone && popupData.available > 0 && (
                <span className="ml-auto text-emerald-400 text-xs font-bold">Zone {popupData.zone}</span>
              )}
            </div>

            {/* ETA row */}
            {popupData.eta !== null && popupData.eta !== undefined && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-400 text-xs">Estimated Arrival</span>
                </div>
                <span className="text-blue-400 font-bold text-sm">~{popupData.eta} min</span>
              </div>
            )}

            {/* Data source + auto-dismiss note */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    popupData.available > 0 ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="text-slate-600 text-xs">
                  {popupData.dataLabel.trim().replace(/^\[|\]$/g, '')}
                </span>
              </div>
              <span className="text-slate-700 text-xs">Auto-closes in 8s</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setPopupVisible(false); if (autoDismissRef.current) clearTimeout(autoDismissRef.current); }}
                className="flex-1 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all"
              >
                Dismiss
              </button>
              <a
                href="#parking-availability"
                onClick={() => { setPopupVisible(false); if (autoDismissRef.current) clearTimeout(autoDismissRef.current); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: popupData.available > 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${popupData.available > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: popupData.available > 0 ? "#34d399" : "#f87171",
                }}
              >
                <ExternalLink className="w-3 h-3" /> View Details
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
