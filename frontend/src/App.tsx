// Updated Navbar with specific local image paths
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Sun, Moon, Activity, Database, Shield } from "lucide-react";
import ClientListPage from "./pages/ClientListPage";
import ConfigurationPage from "./pages/ConfigurationPage";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  return (
    <Router>
      <div className={theme === "dark" ? "dark" : ""}>
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f1a] text-slate-900 dark:text-white transition-all font-sans">
          
          <nav className="bg-white dark:bg-[#0f172a] border-b dark:border-slate-800 px-8 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
            
            <Link to="/" className="flex items-center group">
              {/* Image path points directly to the public folder */}
              <div className="relative h-10 w-40 flex items-center">
                <img 
                  src={theme === "dark" ? "/logo-light.png":"/logo-dark.png"} 
                  alt="NTT DATA" 
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    // This will show a red text if the image is not found
                    console.error("Logo not found at path:", e.currentTarget.src);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Fallback Text if images fail to load */}
                <span className="dark:text-white text-slate-900 font-black text-xl ml-2 hidden [img[style*='display: none']+&]:block">
                  NTT <span className="text-blue-600">DATA</span>
                </span>
              </div>

              <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none">
                  Staging Portal
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-10">
              <div className="hidden lg:flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Link to="/" className="hover:text-blue-600 flex items-center gap-2 transition-all">
                  <Database size={14}/> Tenants Inventory
                </Link>
                <div className="flex items-center gap-2 opacity-30 cursor-not-allowed">
                  <Activity size={14}/> Live Tracker
                </div>
              </div>
              
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 hover:border-blue-500/50 transition-all shadow-sm"
              >
                {theme === "light" ? 
                  <Moon size={18} className="text-blue-700" /> : 
                  <Sun size={18} className="text-yellow-400" />
                }
              </button>
            </div>
          </nav>

          <Routes>
            <Route path="/" element={<ClientListPage />} />
            <Route path="/config/:clientId" element={<ConfigurationPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}