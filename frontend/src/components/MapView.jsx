// frontend/src/components/MapView.jsx
// ============================================================
// GPS MAP NAVIGATION — uses Leaflet + OpenStreetMap
// ============================================================
// Uses Leaflet via window.L (loaded from CDN in index.html)
// No ESM import issues — works reliably with Vite
// ============================================================

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

// ─── Parking Lot Coordinate System ──────────────────────────
// A real-world anchor point used as the parking lot center.
const ENTRANCE = { lat: 18.5209, lng: 73.8567 };
const EXIT     = { lat: 18.5200, lng: 73.8567 };

const SLOT_COORDINATES = {
  A1: { lat: 18.5208, lng: 73.8561 },
  A2: { lat: 18.5208, lng: 73.8563 },
  A3: { lat: 18.5208, lng: 73.8565 },
  A4: { lat: 18.5208, lng: 73.8567 },
  A5: { lat: 18.5208, lng: 73.8569 },
  B1: { lat: 18.5206, lng: 73.8561 },
  B2: { lat: 18.5206, lng: 73.8563 },
  B3: { lat: 18.5206, lng: 73.8565 },
  B4: { lat: 18.5206, lng: 73.8567 },
  B5: { lat: 18.5206, lng: 73.8569 },
  C1: { lat: 18.5204, lng: 73.8561 },
  C2: { lat: 18.5204, lng: 73.8563 },
  C3: { lat: 18.5204, lng: 73.8565 },
  C4: { lat: 18.5204, lng: 73.8567 },
  C5: { lat: 18.5204, lng: 73.8569 },
  D1: { lat: 18.5202, lng: 73.8561 },
  D2: { lat: 18.5202, lng: 73.8563 },
  D3: { lat: 18.5202, lng: 73.8565 },
  D4: { lat: 18.5202, lng: 73.8567 },
  D5: { lat: 18.5202, lng: 73.8569 },
};

function getDistanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

export default function MapView({ slotId, mode = "to-slot" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [loading, setLoading] = useState(true);

  const slotCoords = SLOT_COORDINATES[slotId] || ENTRANCE;

  // ─── Get real GPS location ───────────────────────────────
  // No simulated fallback — if GPS is denied, userLocation stays null
  // and the map shows only the facility/slot markers.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser. Map shows facility location only.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        const msg = err.code === 1
          ? "GPS permission denied. Map shows facility location only — your position is not displayed."
          : "GPS temporarily unavailable. Map shows facility location only.";
        setGpsError(msg);
        setLoading(false); // userLocation remains null — no fake position shown
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // ─── Build Leaflet map via window.L (CDN) ───────────────
  useEffect(() => {
    if (loading || !mapRef.current) return;

    const L = window.L;
    if (!L) {
      console.error("Leaflet not loaded from CDN");
      return;
    }

    // Destroy previous map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // ── Create map ─────────────────────────────────────────
    const map = L.map(mapRef.current, {
      center: [ENTRANCE.lat, ENTRANCE.lng],
      zoom: 18,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap tiles — FREE, no API key
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(map);

    // ── Custom pin icon helper ─────────────────────────────
    const makeIcon = (color, emoji) =>
      L.divIcon({
        className: "",
        html: `<div style="
          background:${color};border:3px solid white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          width:34px;height:34px;display:flex;align-items:center;
          justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4);">
          <span style="transform:rotate(45deg);font-size:15px;">${emoji}</span>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      });

    // ── Markers ────────────────────────────────────────────
    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], { icon: makeIcon("#3b82f6", "📍") })
        .addTo(map)
        .bindPopup("<b>📍 Your Location</b>");
    }

    L.marker([ENTRANCE.lat, ENTRANCE.lng], { icon: makeIcon("#10b981", "🚪") })
      .addTo(map)
      .bindPopup("<b>🚪 Parking Entrance</b>");

    L.marker([EXIT.lat, EXIT.lng], { icon: makeIcon("#f97316", "🚗") })
      .addTo(map)
      .bindPopup("<b>🚗 Parking Exit</b>");

    if (slotId) {
      L.marker([slotCoords.lat, slotCoords.lng], { icon: makeIcon("#a855f7", "🅿️") })
        .addTo(map)
        .bindPopup(`<b>🅿️ Slot ${slotId}</b><br/>Your assigned parking slot`)
        .openPopup();
    }

    // ── Route polyline ─────────────────────────────────────
    let routePoints = [];
    if (mode === "to-slot") {
      routePoints = userLocation
        ? [
            [userLocation.lat, userLocation.lng],
            [ENTRANCE.lat, ENTRANCE.lng],
            [slotCoords.lat, ENTRANCE.lng],
            [slotCoords.lat, slotCoords.lng],
          ]
        : [
            [ENTRANCE.lat, ENTRANCE.lng],
            [slotCoords.lat, ENTRANCE.lng],
            [slotCoords.lat, slotCoords.lng],
          ];
    } else {
      routePoints = [
        [slotCoords.lat, slotCoords.lng],
        [slotCoords.lat, EXIT.lng],
        [EXIT.lat, EXIT.lng],
      ];
    }

    L.polyline(routePoints, {
      color: "#3b82f6",
      weight: 5,
      opacity: 0.85,
      dashArray: mode === "to-exit" ? "10 6" : null,
    }).addTo(map);

    // Fit bounds to show all points
    const allPoints = [
      [ENTRANCE.lat, ENTRANCE.lng],
      [EXIT.lat, EXIT.lng],
      [slotCoords.lat, slotCoords.lng],
      ...(userLocation ? [[userLocation.lat, userLocation.lng]] : []),
    ];
    map.fitBounds(allPoints, { padding: [40, 40] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, userLocation, slotId, mode]);

  const distToEntrance = userLocation ? getDistanceMeters(userLocation, ENTRANCE) : null;
  const distSlotToExit = getDistanceMeters(slotCoords, EXIT);

  return (
    <div className="space-y-3">
      {gpsError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-yellow-400 text-xs">{gpsError}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {mode === "to-slot" ? (
          <>
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              📍 You → 🚪 Entrance {distToEntrance ? `(~${distToEntrance}m)` : ""}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
              🚪 Entrance → 🅿️ Slot {slotId}
            </span>
          </>
        ) : (
          <span className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
            🅿️ Slot {slotId} → 🚗 Exit (~{distSlotToExit}m)
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-72 rounded-2xl bg-slate-800/50 border border-slate-700/50 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Getting your location…</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full rounded-2xl overflow-hidden border border-slate-700/50"
          style={{ height: "340px", zIndex: 1 }}
        />
      )}

      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span>📍 You</span>
        <span>🚪 Entrance</span>
        <span>🅿️ Slot {slotId}</span>
        <span>🚗 Exit</span>
        <span className="ml-auto text-slate-600">Powered by OpenStreetMap</span>
      </div>
    </div>
  );
}
