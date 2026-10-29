// frontend/src/pages/History.jsx
// Parking history page

import { useEffect, useState } from "react";
import { History as HistoryIcon, RefreshCw, Loader2 } from "lucide-react";
import HistoryTable from "../components/HistoryTable";
import { fetchHistory } from "../api/parkingApi";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchHistory();
      setHistory(res.data.data);
    } catch (err) {
      console.error("History load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <HistoryIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Parking History</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            All completed parking sessions
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-center">
          <div className="text-2xl font-bold text-white">{history.length}</div>
          <div className="text-slate-500 text-xs mt-0.5">Total Sessions</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {history.length > 0
              ? Math.round(history.reduce((s, r) => s + (r.duration || 0), 0) / history.length)
              : 0}m
          </div>
          <div className="text-slate-500 text-xs mt-0.5">Avg Duration</div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {[...new Set(history.map((r) => r.slotId))].length}
          </div>
          <div className="text-slate-500 text-xs mt-0.5">Slots Used</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <HistoryTable history={history} />
        )}
      </div>
    </div>
  );
}
