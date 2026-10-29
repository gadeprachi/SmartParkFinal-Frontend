// frontend/src/components/Toast.jsx
// Simple toast notification system

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const bgColors = {
  success: "border-emerald-500/40 bg-emerald-900/30",
  error: "border-red-500/40 bg-red-900/30",
  warning: "border-yellow-500/40 bg-yellow-900/30",
  info: "border-blue-500/40 bg-blue-900/30",
};

export function Toast({ id, message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-xl animate-slide-in ${bgColors[type]}`}
    >
      <div className="mt-0.5">{icons[type]}</div>
      <p className="flex-1 text-sm text-slate-200 leading-relaxed">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-slate-400 hover:text-white transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-sm">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for managing toasts
import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
