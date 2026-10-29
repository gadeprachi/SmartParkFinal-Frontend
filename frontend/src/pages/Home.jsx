// frontend/src/pages/Home.jsx
// Landing page — Hero, Stats, SDG 11

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ParkingCircle, MapPin, Car, Users, CheckCircle,
  ArrowRight, Globe, Zap, Shield
} from "lucide-react";
import { fetchStats } from "../api/parkingApi";

export default function Home() {
  const [stats, setStats] = useState({ available: 0, occupied: 0, waiting: 0, total: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchStats()
      .then((res) => {
        setStats(res.data.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* SDG Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
            <Globe className="w-4 h-4" />
            SDG 11 — Sustainable Cities and Communities
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight mb-6">
            Smart{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Parking
            </span>
            <br />
            Management
            <br />
            <span className="text-slate-400 text-4xl md:text-5xl font-bold">System</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Find your slot. Park smarter. Move better.
            <br />
            <span className="text-slate-500 text-base">
              Built with Queue · Stack · Real-time GPS Navigation
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              to="/parking"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg transition-all duration-200 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
            >
              <ParkingCircle className="w-5 h-5" />
              Find Parking
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/smart-journey"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg transition-all duration-200 shadow-xl shadow-blue-500/25 hover:scale-105"
            >
              <Zap className="w-5 h-5" />
              Smart Journey
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-bold text-lg transition-all duration-200"
            >
              <MapPin className="w-5 h-5 text-emerald-400" />
              View Parking Layout
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Stats ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Slots",     value: stats.total,     color: "bg-slate-800 border-slate-700",               text: "text-white" },
            { label: "Available",       value: stats.available, color: "bg-emerald-500/10 border-emerald-500/30",     text: "text-emerald-400" },
            { label: "Occupied",        value: stats.occupied,  color: "bg-red-500/10 border-red-500/30",             text: "text-red-400" },
            { label: "Waiting",         value: stats.waiting,   color: "bg-orange-500/10 border-orange-500/30",       text: "text-orange-400" },
          ].map(({ label, value, color, text }) => (
            <div
              key={label}
              className={`rounded-2xl border p-5 text-center ${color} transition-all hover:scale-105 cursor-default`}
            >
              <div className={`text-3xl font-black ${text} mb-1`}>
                {loaded ? value : "—"}
              </div>
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-center text-white text-2xl font-bold mb-10">
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Car className="w-6 h-6 text-emerald-400" />,
              bg: "bg-emerald-500/10 border-emerald-500/20",
              title: "Enter Vehicle",
              desc: "Enter your vehicle number. The system instantly finds the nearest available slot using a linear scan algorithm.",
            },
            {
              icon: <Users className="w-6 h-6 text-orange-400" />,
              bg: "bg-orange-500/10 border-orange-500/20",
              title: "FIFO Queue",
              desc: "If all slots are full, your vehicle is added to a waiting queue. When a slot frees, the first vehicle in queue gets it.",
            },
            {
              icon: <MapPin className="w-6 h-6 text-blue-400" />,
              bg: "bg-blue-500/10 border-blue-500/20",
              title: "GPS Navigation",
              desc: "Navigate from your location to your assigned slot and to the exit using live GPS and an interactive map.",
            },
            {
              icon: <Zap className="w-6 h-6 text-purple-400" />,
              bg: "bg-purple-500/10 border-purple-500/20",
              title: "Smart Journey",
              desc: "Start a journey and get automatic parking alerts before you arrive — no need to open the app while driving.",
            },
          ].map(({ icon, bg, title, desc }) => (
            <div key={title} className={`rounded-2xl border p-6 ${bg}`}>
              <div className="mb-3">{icon}</div>
              <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
