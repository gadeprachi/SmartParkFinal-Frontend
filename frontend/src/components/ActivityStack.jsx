// frontend/src/components/ActivityStack.jsx
// Displays the LIFO recent activity stack

import { Activity, Car, LogOut, Clock3, AlertCircle } from "lucide-react";

const activityConfig = {
  PARKED: {
    icon: <Car className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "Parked",
  },
  EXITED: {
    icon: <LogOut className="w-3.5 h-3.5" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-400",
    label: "Exited",
  },
  QUEUED: {
    icon: <Clock3 className="w-3.5 h-3.5" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    dot: "bg-orange-400",
    label: "Queued",
  },
};

export default function ActivityStack({ activities = [] }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
            <p className="text-slate-500 text-xs">LIFO Stack — Latest on top</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
          <span className="text-purple-400 text-xs font-bold">{activities.length}</span>
        </div>
      </div>

      {/* DSA Note */}
      <div className="mb-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50">
        <p className="text-slate-500 text-xs">
          <span className="text-purple-400 font-medium">DSA Stack:</span> Most recent action shown at top.
          Older actions are below (LIFO order).
        </p>
      </div>

      {/* Stack */}
      {activities.length === 0 ? (
        <div className="text-center py-6">
          <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No activity yet</p>
          <p className="text-slate-600 text-xs mt-1">Actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* TOP indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="h-px flex-1 bg-purple-500/20" />
            <span className="text-purple-500 font-medium">↑ TOP (newest)</span>
            <div className="h-px flex-1 bg-purple-500/20" />
          </div>

          {activities.map((activity, index) => {
            const config = activityConfig[activity.type] || activityConfig.PARKED;
            return (
              <div
                key={`${activity.vehicleNumber}-${index}`}
                className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg} animate-fade-in`}
              >
                {/* Type icon */}
                <div className={`mt-0.5 shrink-0 ${config.color}`}>{config.icon}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">
                      {activity.vehicleNumber}
                    </span>
                    {activity.slotId && (
                      <span className="text-slate-400 text-xs">→ {activity.slotId}</span>
                    )}
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  {activity.note && (
                    <p className="text-slate-500 text-xs mt-0.5">{activity.note}</p>
                  )}
                  {activity.duration !== undefined && activity.type === "EXITED" && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      Duration: {activity.duration} min
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                {activity.timestamp && (
                  <span className="text-slate-600 text-xs shrink-0">
                    {new Date(activity.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            );
          })}

          {/* BOTTOM indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="h-px flex-1 bg-slate-700" />
            <span>↓ BOTTOM (oldest)</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
        </div>
      )}
    </div>
  );
}
