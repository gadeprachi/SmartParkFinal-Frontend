// frontend/src/App.jsx
// Root component with routing

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Parking from "./pages/Parking";
import History from "./pages/History";
import FindMyCar from "./pages/FindMyCar";
import NotificationSettings from "./pages/NotificationSettings";
import NotificationWatcher from "./components/NotificationWatcher";
import SmartJourney from "./pages/SmartJourney";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0f1e]">
        <Navbar />
        <NotificationWatcher />
        <main>
          <Routes>
            <Route path="/"          element={<Home />}      />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parking"   element={<Parking />}   />
            <Route path="/history"   element={<History />}   />
            <Route path="/find-my-car" element={<FindMyCar />} />
            <Route path="/settings" element={<NotificationSettings />} />
            <Route path="/smart-journey" element={<SmartJourney />} />
            {/* Catch-all */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <div className="text-6xl mb-4">🅿️</div>
                <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
                <a href="/" className="text-emerald-400 hover:underline">Go Home</a>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
