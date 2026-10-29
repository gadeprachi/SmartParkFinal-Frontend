// frontend/src/components/StatCard.jsx
// Animated statistic card for dashboard counters

import { TrendingUp } from "lucide-react";

const colorMap = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    icon: "bg-emerald-500/20 text-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    icon: "bg-red-500/20 text-red-400",
    glow: "shadow-red-500/10",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
    icon: "bg-yellow-500/20 text-yellow-400",
    glow: "shadow-yellow-500/10",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    icon: "bg-blue-500/20 text-blue-400",
    glow: "shadow-blue-500/10",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    icon: "bg-purple-500/20 text-purple-400",
    glow: "shadow-purple-500/10",
  },
};

export default function StatCard({ label, value, icon: Icon, color = "emerald", subtitle }) {
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={`rounded-2xl border p-5 ${c.bg} ${c.border} shadow-lg ${c.glow} hover:scale-105 transition-transform duration-200 cursor-default`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`text-4xl font-bold ${c.text}`}>{value ?? "—"}</p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${c.icon}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
}
