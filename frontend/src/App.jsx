import { useState } from "react";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div className="min-h-screen bg-[#07090f] text-white font-sans">
      <Nav page={page} setPage={setPage} />
      {page === "home" ? <HomePage /> : <HistoryPage />}
    </div>
  );
}

function Nav({ page, setPage }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#07090f]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-30" />
          <div className="relative w-8 h-8 rounded-full bg-cyan-400/10 border border-cyan-400/60 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" stroke="#00e5ff" strokeWidth="1.5" />
              <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="text-sm font-mono font-bold tracking-[0.2em] text-white uppercase">
          Rec<span className="text-cyan-400">all</span>
        </span>
      </div>

      <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10">
        {[
          { id: "home", label: "Live Session" },
          { id: "history", label: "Memory Bank" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            className={`px-5 py-2 rounded-full text-xs font-mono font-semibold tracking-widest uppercase transition-all duration-300 ${
              page === tab.id
                ? "bg-cyan-400 text-[#07090f] shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono text-white/30 tracking-widest">SYSTEM ONLINE</span>
      </div>
    </nav>
  );
}