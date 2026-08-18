import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Trash2, Award, Shield, Eye, EyeOff, CheckCircle2, User, Hammer } from "lucide-react";

export const Login = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("citizen");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLoginTab) {
        const user = await login(email, password);
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "worker") {
          navigate("/worker");
        } else {
          navigate("/");
        }
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const user = await signup(name, email, password, role, phone, []);
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "worker") {
          navigate("/worker");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = () => {
    setIsLoginTab(!isLoginTab);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setRole("citizen");
  };

  // Demo Credentials quick fill helpers
  const fillDemoUser = (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setIsLoginTab(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 antialiased">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 civic-card shadow-lg overflow-hidden my-auto">
        {/* Left Side: Civic Branding */}
        <div className="hidden md:flex md:col-span-5 bg-slate-900 text-white p-8 flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg">
                E
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">EcoSort Platform</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Report Waste. Earn Rewards.</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect directly with municipal sanitation teams. Submit verified geo-tagged reports with AI classification and track resolution progress in real-time.
              </p>
            </div>

            {/* Demo Quick Fill Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Quick Demo Accounts:</p>
              <div className="space-y-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => fillDemoUser("citizen1@waste.com", "citizen123")}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200 transition-colors cursor-pointer"
                >
                  👤 Citizen Demo (citizen1@waste.com)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoUser("admin@waste.com", "admin123")}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-emerald-300 transition-colors cursor-pointer"
                >
                  🛡️ Admin Demo (admin@waste.com)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoUser("worker1@waste.com", "worker123")}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-300 transition-colors cursor-pointer"
                >
                  🔨 Worker Demo (worker1@waste.com)
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Municipal Sanitation Portal V2
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="col-span-1 md:col-span-7 bg-white p-6 sm:p-8 flex flex-col justify-center">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => setIsLoginTab(true)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer mr-6 ${
                isLoginTab
                  ? "border-emerald-600 text-emerald-700 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign In to Account
            </button>
            <button
              onClick={() => setIsLoginTab(false)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                !isLoginTab
                  ? "border-emerald-600 text-emerald-700 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Register New Citizen
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {!isLoginTab && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pr-10 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLoginTab && (
              <>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="citizen">Citizen (Reporter)</option>
                    <option value="worker">Sanitation Field Worker</option>
                    <option value="admin">Municipal Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9988776655"
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? "Processing..." : isLoginTab ? "Sign In" : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
