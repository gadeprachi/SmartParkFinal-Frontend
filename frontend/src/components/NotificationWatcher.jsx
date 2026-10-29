import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, X, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { getSSEStreamUrl } from "../api/parkingApi";
import { getSessionId } from "../api/session";

const RECONNECT_DELAY_MS = 3000; // Wait 3 s before reconnecting

export default function NotificationWatcher() {
  const [notification, setNotification] = useState(null);
  const [connected, setConnected] = useState(false);
  const sessionId = getSessionId();
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up any existing connection first
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = getSSEStreamUrl(sessionId);
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    // ── Connected ─────────────────────────────────────────────
    es.addEventListener("connected", () => {
      if (!mountedRef.current) return;
      setConnected(true);
      console.log("📡 SSE connected");
    });

    // ── Incoming notification ─────────────────────────────────
    es.addEventListener("notification", (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setNotification(data);

        // Native browser notification (if permission granted)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(data.title, {
            body: `${data.message} — ${data.level ?? ""} ${data.zone ?? ""}`.trim(),
            icon: "/favicon.ico",
          });
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    // ── Error / disconnected ──────────────────────────────────
    es.onerror = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      es.close();
      esRef.current = null;
      console.warn("📡 SSE disconnected — reconnecting in", RECONNECT_DELAY_MS, "ms");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return (
    <>
      {/* ── Connection status pill ─────────────────────────── */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500 ${
          connected
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-slate-800/60 border-slate-700/50 text-slate-500"
        }`}
      >
        {connected ? (
          <><Wifi className="w-3 h-3" /> Live</>
        ) : (
          <><WifiOff className="w-3 h-3" /> Connecting…</>
        )}
      </div>

      {/* ── Notification toast ─────────────────────────────── */}
      {notification && (
        <div className="fixed right-4 top-20 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold">{notification.title}</p>
              <p className="text-emerald-300 text-sm mt-1">{notification.message}</p>
              {(notification.level || notification.zone) && (
                <p className="text-slate-400 text-xs mt-1">
                  {notification.level} {notification.zone && `• ${notification.zone}`}
                </p>
              )}
              <Link
                to="/dashboard"
                onClick={() => setNotification(null)}
                className="inline-block mt-3 text-sm text-emerald-400 hover:text-emerald-300"
              >
                View available slot →
              </Link>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-500 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
