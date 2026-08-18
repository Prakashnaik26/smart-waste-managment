import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Map } from "../components/Map";
import {
  ShieldCheck, MapPin, Award, ArrowRight, Camera, CheckCircle2,
  Clock, BarChart3, Users, Sparkles, ChevronRight, LogIn, FileText, CheckCircle
} from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          fetch(`${API_URL}/api/stats/dashboard`),
          fetch(`${API_URL}/api/reports`)
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.summary);
        }

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setReports(reportsData);
        }
      } catch (err) {
        console.error("Error loading landing page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-xs">
            E
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-slate-900">EcoSort</span>
            <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
              Civic Platform V2
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
          <a href="#waste-map" className="hover:text-emerald-600 transition-colors">Waste Map</a>
          <a href="#impact" className="hover:text-emerald-600 transition-colors">Community Impact</a>
        </nav>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Smart Waste Management Platform</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            Report Waste. Improve Your Community.
          </h1>

          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A civic technology platform enabling citizens to submit geo-tagged waste reports with AI-assisted classification, earn citizen rewards, and help municipal teams resolve waste hazards faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Report Waste</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#waste-map"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center justify-center space-x-2"
            >
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>View Waste Map</span>
            </a>
          </div>
        </div>
      </section>

      {/* Database Driven Community Impact Metrics */}
      <section id="impact" className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="civic-card p-5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Reports</span>
              <span className="text-2xl md:text-3xl font-black text-slate-900 mt-1 block">
                {stats?.totalReports ?? reports.length}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Database Verified</span>
            </div>

            <div className="civic-card p-5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reports Resolved</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-700 mt-1 block">
                {stats?.resolvedReports ?? reports.filter(r => r.status === "Completed" || r.status === "resolved").length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Proof of resolution</span>
            </div>

            <div className="civic-card p-5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Citizens</span>
              <span className="text-2xl md:text-3xl font-black text-slate-900 mt-1 block">
                {stats?.citizenCount ?? 12}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Community Reporters</span>
            </div>

            <div className="civic-card p-5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Resolution SLA</span>
              <span className="text-2xl md:text-3xl font-black text-slate-900 mt-1 block">
                {stats?.avgResolutionTimeFormatted ?? "1d 4h"}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Turnaround time</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 md:px-12 text-center space-y-12">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">How Reporting Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="civic-card p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">1. Capture Waste</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take or upload a clear photo of the waste accumulation in your neighborhood.
              </p>
            </div>

            <div className="civic-card p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">2. AI Classification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI categorizes waste type (Plastic, Organic, E-Waste) with confidence score verification.
              </p>
            </div>

            <div className="civic-card p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">3. Geo-Tag & Submit</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                GPS automatically tags coordinates on an interactive Leaflet map pin. Earn +5 points!
              </p>
            </div>

            <div className="civic-card p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">4. Track & Resolve</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track status progress from assignment to resolution proof photos. Earn +10 bonus points!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Waste Map Section */}
      <section id="waste-map" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Live Geographic Map
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Civic Waste Map & Hotspots</h2>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer self-start"
            >
              Report a New Hazard
            </button>
          </div>

          <div className="h-96 rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
            <Map
              reports={reports}
              center={[12.9716, 77.5946]}
              zoom={12}
              showSearch={true}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6 md:px-12 text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
              E
            </div>
            <span className="font-extrabold text-slate-900">EcoSort Smart Waste Management</span>
          </div>

          <p>© 2026 EcoSort Municipal Platform. Built for verified community sustainability.</p>
        </div>
      </footer>
    </div>
  );
};
