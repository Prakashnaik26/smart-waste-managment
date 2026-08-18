import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "../components/Map";
import { ReportDetailModal } from "../components/ReportDetailModal";
import { NotificationBell } from "../components/NotificationBell";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, AreaChart, Area, Legend
} from "recharts";
import {
  LogOut, Shield, BarChart3, ListTodo, MapPin, CheckCircle,
  AlertCircle, Users, Award, Sparkles, Loader2, User,
  Download, Plus, Search, Hammer, CheckSquare, Clock, Filter, Eye, X,
  MessageSquare, Send, Check, AlertTriangle, Camera, Upload, RefreshCw,
  TrendingUp, Activity, Flame, ChevronRight, ArrowUpRight, ArrowRight, HardHat, CheckCircle2, ShieldCheck
} from "lucide-react";

const CATEGORY_COLORS = {
  Plastic: "#2563eb",
  Organic: "#059669",
  Paper: "#d97706",
  Cardboard: "#7c3aed",
  Metal: "#475569",
  Glass: "#0891b2",
  "E-Waste": "#9333ea",
  Hazardous: "#dc2626",
  Mixed: "#64748b"
};

export const AdminDashboard = () => {
  const { user, logout, token, API_URL } = useAuth();
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Time Range Filter
  const [timeRange, setTimeRange] = useState("30d"); // today, 7d, 30d, 90d, all
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Tabs & Search & Filters
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, reports, map, workers
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Selection & Detail Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Review Modal (Verify / Reject before confirming)
  const [reviewReport, setReviewReport] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewAction, setReviewAction] = useState(null); // "verify" | "reject"

  // Map center state for top hotspots click
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(12);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    if (!stats) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [reportsRes, statsRes, usersRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports`),
        fetch(`${API_URL}/api/stats/dashboard?range=${timeRange}`, { headers }),
        fetch(`${API_URL}/api/auth/users`, { headers }),
        fetch(`${API_URL}/api/logs`, { headers })
      ]);

      if (reportsRes.ok && statsRes.ok && usersRes.ok && logsRes.ok) {
        const reportsData = await reportsRes.json();
        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        const logsData = await logsRes.json();

        setReports(reportsData);
        setStats(statsData);
        setLogs(logsData);
        setWorkers(usersData.filter(u => u.role === "worker"));
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerifyReport = async (reportId) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify report");

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, isVerified: true, status: "Verified" } : r));
      fetchData();
    } catch (err) {
      console.error("Verify error:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectReport = async (reportId, reason) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: "Rejected",
          resolutionNote: reason || "Rejected by admin"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject report");

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "Rejected" } : r));
      fetchData();
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const openReviewModal = (report) => {
    setReviewReport(report);
    setRejectionReason("");
    setReviewAction(null);
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewReport(null);
    setRejectionReason("");
    setReviewAction(null);
  };

  const handleReviewSubmit = async () => {
    if (!reviewReport || !reviewAction) return;
    if (reviewAction === "verify") {
      await handleVerifyReport(reviewReport.id);
    } else if (reviewAction === "reject") {
      await handleRejectReport(reviewReport.id, rejectionReason);
    }
    closeReviewModal();
  };

  const handleStatusFilterClick = (st) => {
    setStatusFilter(st);
    setActiveTab("reports");
  };

  // Filtered reports for Management table
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reporterName && r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "Submitted" && (r.status === "Submitted" || r.status === "Not Assigned")) ||
      (statusFilter === "Resolved" && (r.status === "Completed" || r.status === "resolved")) ||
      r.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || (r.priority || "Medium") === priorityFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Calculate formatted relative update time
  const getMinutesAgo = () => {
    const diffMins = Math.floor((new Date() - lastUpdated) / (1000 * 60));
    if (diffMins < 1) return "Just now";
    return `${diffMins} min ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between px-6 md:px-8 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-black text-slate-900 text-sm tracking-tight block leading-tight">Municipal Admin Center</span>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Operations Control
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationBell
            onSelectReport={(reportId) => {
              const matched = reports.find(r => r.id === reportId);
              if (matched) {
                setSelectedReport(matched);
                setIsDetailModalOpen(true);
              }
            }}
          />

          <div className="flex items-center space-x-2 text-xs border-l border-slate-200 pl-4">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-700 font-bold text-xs">
              {user?.name ? user.name[0] : "A"}
            </div>
            <span className="font-bold text-slate-800 hidden sm:inline">{user?.name || "Admin"}</span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 cursor-pointer transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col justify-between p-4">
          <nav className="space-y-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === "dashboard" ? "text-emerald-400" : "text-slate-400"}`} />
              <span>Operations Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-slate-900 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ListTodo className={`w-4 h-4 ${activeTab === "reports" ? "text-emerald-400" : "text-slate-400"}`} />
              <div className="flex-1 flex justify-between items-center">
                <span>Report Management</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "reports" ? "bg-slate-800 text-emerald-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {reports.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "map"
                  ? "bg-slate-900 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MapPin className={`w-4 h-4 ${activeTab === "map" ? "text-emerald-400" : "text-slate-400"}`} />
              <span>Waste Map & Hotspots</span>
            </button>

            <button
              onClick={() => setActiveTab("workers")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "workers"
                  ? "bg-slate-900 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <HardHat className={`w-4 h-4 ${activeTab === "workers" ? "text-emerald-400" : "text-slate-400"}`} />
              <div className="flex-1 flex justify-between items-center">
                <span>Field Workers</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "workers" ? "bg-slate-800 text-emerald-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {workers.length}
                </span>
              </div>
            </button>
          </nav>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3 font-mono">
            Municipal Operations System
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Dashboard Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Operations Overview</h1>
                    {refreshing && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Monitor waste reports, field operations, and community cleanup activity.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Action Buttons */}
                  <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-200">
                    <button
                      onClick={() => setActiveTab("reports")}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Review Reports</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("map")}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open Map</span>
                    </button>
                  </div>

                  {/* Time Range Picker */}
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 3 Months</option>
                    <option value="all">All Time</option>
                  </select>

                  {/* Refresh Button */}
                  <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer transition-all shadow-2xs"
                    title="Refresh analytics data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
                  </button>

                  <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                    Last updated {getMinutesAgo()}
                  </span>
                </div>
              </div>

              {/* LEVEL 1: KPI Summary Cards (6 responsive cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total Reports</span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {stats?.summary?.totalReports ?? reports.length}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 font-mono truncate">
                    {stats?.summary?.totalTrendText || `${stats?.summary?.submittedTodayCount || 0} submitted today`}
                  </div>
                </div>

                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Needs Review</span>
                  <div className="text-2xl font-black text-amber-600 tracking-tight">
                    {stats?.summary?.needsReviewReports ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-700 font-mono truncate">
                    {stats?.summary?.reviewTrendText || "Awaiting action"}
                  </div>
                </div>

                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">High Priority</span>
                  <div className="text-2xl font-black text-red-600 tracking-tight">
                    {stats?.summary?.highPriorityReports ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-red-600 font-mono truncate">
                    {stats?.summary?.criticalCount ? `${stats?.summary?.criticalCount} critical` : "Urgent items"}
                  </div>
                </div>

                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">In Progress</span>
                  <div className="text-2xl font-black text-blue-600 tracking-tight">
                    {stats?.summary?.inProgressReports ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-700 font-mono truncate">
                    {stats?.fieldOperations?.assigned ? `${stats.fieldOperations.assigned} assigned` : "Field active"}
                  </div>
                </div>

                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Resolved</span>
                  <div className="text-2xl font-black text-emerald-700 tracking-tight">
                    {stats?.summary?.resolvedReports ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700 font-mono truncate">
                    {stats?.summary?.resolvedTrendText || "Cleared hazards"}
                  </div>
                </div>

                <div className="civic-card p-4 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Avg Resolution</span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {stats?.summary?.avgResolutionTimeFormatted ?? "12.4h"}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 font-mono truncate">
                    Average SLA clear
                  </div>
                </div>
              </div>

              {/* LEVEL 2: Report Trends + Waste Category Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Report Trends Chart (7 cols) */}
                <div className="lg:col-span-7 civic-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Report Trends</h3>
                      <p className="text-[11px] text-slate-500">Submission, verification, and resolution rate over time</p>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] font-bold">
                      <span className="flex items-center space-x-1 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>Submitted</span>
                      </span>
                      <span className="flex items-center space-x-1 text-purple-700">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>Verified</span>
                      </span>
                      <span className="flex items-center space-x-1 text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>Resolved</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.reportTrends || []}>
                        <defs>
                          <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorVer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="Submitted" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                        <Area type="monotone" dataKey="Verified" stroke="#9333ea" strokeWidth={2} fillOpacity={1} fill="url(#colorVer)" />
                        <Area type="monotone" dataKey="Resolved" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Waste Category Breakdown Donut Chart (5 cols) */}
                <div className="lg:col-span-5 civic-card p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Waste Category Breakdown</h3>
                    <p className="text-[11px] text-slate-500">Distribution across waste types</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                    {/* Donut Chart with Center Label */}
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.categoryData || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {(stats?.categoryData || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || "#059669"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-xl font-black text-slate-900 leading-none">
                          {stats?.summary?.totalReports || reports.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                          Reports
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Percentage List */}
                    <div className="flex-1 w-full space-y-2 text-xs">
                      {(stats?.categoryData || []).map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || "#059669" }}></span>
                            <span className="font-bold text-slate-700 text-xs">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900">{cat.percentage}%</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">({cat.value})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* LEVEL 3: Waste Hotspot Map + Top Waste Hotspots */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Waste Hotspot Map Overview (7 cols) */}
                <div className="lg:col-span-7 civic-card p-5 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Waste Hotspot Map</h3>
                      <p className="text-[11px] text-slate-500">Live priority markers and hotspot clusters</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("map")}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Full Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
                    <Map
                      reports={filteredReports}
                      hotspots={stats?.allHotspots || []}
                      center={mapCenter}
                      zoom={mapZoom}
                      showSearch={false}
                      isAdmin={true}
                      onQuickAssign={(report) => {
                        setSelectedReport(report);
                        setIsDetailModalOpen(true);
                      }}
                    />
                  </div>
                </div>

                {/* Top Waste Hotspots Ranked List (5 cols) */}
                <div className="lg:col-span-5 civic-card p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Top Waste Hotspots</h3>
                    <p className="text-[11px] text-slate-500">Ranked highest concentration zones</p>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-80 pr-1">
                    {stats?.topHotspots && stats.topHotspots.length > 0 ? (
                      stats.topHotspots.map((hs, idx) => (
                        <div
                          key={hs.key || idx}
                          onClick={() => {
                            setMapCenter([hs.lat, hs.lng]);
                            setMapZoom(14);
                          }}
                          className="p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{hs.address}</h4>
                              <span className="text-[10px] text-slate-500 font-semibold">{hs.mainCategory}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-xs text-slate-900 block">{hs.count} reports</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              hs.priority === "Critical" ? "bg-red-50 text-red-700 border-red-200" :
                              hs.priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {hs.priority || "Medium"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Not enough location data to identify hotspots.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LEVEL 4: Reports Requiring Attention + Report Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Priority Queue / Reports Requiring Attention (7 cols) */}
                <div className="lg:col-span-7 civic-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Reports Requiring Attention</h3>
                      <p className="text-[11px] text-slate-500">Urgent unresolved waste hazards</p>
                    </div>
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      Priority Queue
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {stats?.priorityQueue && stats.priorityQueue.length > 0 ? (
                      stats.priorityQueue.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 hover:bg-white transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase border ${
                              item.priority === "Critical" ? "bg-red-100 text-red-800 border-red-300" :
                              item.priority === "High" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              "bg-slate-200 text-slate-800 border-slate-300"
                            }`}>
                              {item.priority}
                            </span>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-xs text-slate-900">{item.category}</span>
                                <span className="text-[10px] text-slate-400 font-mono">• {item.timeAgo}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-1">{item.address}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const matched = reports.find(r => r.id === item.id);
                              if (matched) {
                                setSelectedReport(matched);
                                setIsDetailModalOpen(true);
                              }
                            }}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-500 font-medium">
                        No high-priority reports require attention.
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Status Overview (5 cols) */}
                <div className="lg:col-span-5 civic-card p-5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Report Status Overview</h3>
                    <p className="text-[11px] text-slate-500">Click any status to filter Report Management</p>
                  </div>

                  <div className="space-y-2.5">
                    {(stats?.statusBreakdown || []).map((sb) => (
                      <div
                        key={sb.status}
                        onClick={() => handleStatusFilterClick(sb.rawStatus)}
                        className="group cursor-pointer p-2 rounded-xl hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                            {sb.status}
                          </span>
                          <span className="font-extrabold text-slate-900 font-mono">
                            {sb.count}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              sb.status === "Resolved" ? "bg-emerald-600" :
                              sb.status === "Verified" ? "bg-purple-600" :
                              sb.status === "In Progress" || sb.status === "Assigned" ? "bg-blue-600" :
                              sb.status === "Rejected" ? "bg-red-500" :
                              "bg-amber-500"
                            }`}
                            style={{ width: `${Math.max(5, sb.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LEVEL 5 & 6: Field Operations Summary + Resolution Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Field Operations Summary (6 cols) */}
                <div className="lg:col-span-6 civic-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Field Operations</h3>
                      <p className="text-[11px] text-slate-500">Sanitation team status and task workload</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("workers")}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View All Workers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Worker Summary Stat Badges */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-base font-black text-slate-900 block">{stats?.fieldOperations?.totalWorkers || workers.length}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-base font-black text-emerald-700 block">{stats?.fieldOperations?.available || 0}</span>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Available</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-base font-black text-blue-700 block">{stats?.fieldOperations?.assigned || 0}</span>
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Assigned</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-base font-black text-amber-700 block">{stats?.fieldOperations?.inProgress || 0}</span>
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Active</span>
                    </div>
                  </div>

                  {/* Workers Active Workload Table */}
                  <div className="space-y-2">
                    {(stats?.fieldOperations?.workers || []).slice(0, 4).map((w) => (
                      <div key={w.id} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                            {w.name ? w.name[0] : "W"}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{w.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{w.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-slate-600 font-medium">Tasks: <strong className="text-slate-900">{w.activeTasks}</strong></span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            w.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Performance (6 cols) */}
                <div className="lg:col-span-6 civic-card p-5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Resolution Performance</h3>
                    <p className="text-[11px] text-slate-500">Historical cleanup SLA performance metrics</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/80 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Average Resolution</span>
                      <span className="text-2xl font-black text-slate-900 block">{stats?.resolutionPerformance?.avgResolutionTimeFormatted || "12.4h"}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">Mean resolution time</span>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-emerald-50/60 border-emerald-200 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Resolution Rate</span>
                      <span className="text-2xl font-black text-emerald-700 block">{stats?.resolutionPerformance?.resolutionRate || "67%"}</span>
                      <span className="text-[10px] text-emerald-700 font-mono block">Cleared report ratio</span>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-blue-50/60 border-blue-200 space-y-1">
                      <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Fastest Clearance</span>
                      <span className="text-2xl font-black text-blue-700 block">{stats?.resolutionPerformance?.fastestResolutionTimeFormatted || "2.1h"}</span>
                      <span className="text-[10px] text-blue-700 font-mono block">Record clearance time</span>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-amber-50/60 border-amber-200 space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Oldest Unresolved</span>
                      <span className="text-2xl font-black text-amber-700 block">{stats?.resolutionPerformance?.oldestUnresolvedDays || "3.2 days"}</span>
                      <span className="text-[10px] text-amber-700 font-mono block">Max pending report age</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEVEL 7 & 8: Recent Activity + Citizen Engagement */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Activity Feed (6 cols) */}
                <div className="lg:col-span-6 civic-card p-5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Recent Activity</h3>
                    <p className="text-[11px] text-slate-500">Live operational events and status history</p>
                  </div>

                  <div className="space-y-3">
                    {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((ev) => (
                        <div key={ev.id} className="flex items-start space-x-3 text-xs pb-2 border-b border-slate-100 last:border-b-0">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mt-0.5">
                            <Activity className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{ev.relativeTime}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{ev.subtitle}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No recent activity.
                      </div>
                    )}
                  </div>
                </div>

                {/* Citizen Engagement Summary (6 cols) */}
                <div className="lg:col-span-6 civic-card p-5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Citizen Engagement</h3>
                    <p className="text-[11px] text-slate-500">Community reward points and top contributors</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-slate-100">
                    <div className="p-2">
                      <span className="text-base font-black text-slate-900 block">{stats?.citizenEngagement?.activeCitizens || 0}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Active Citizens</span>
                    </div>
                    <div className="p-2">
                      <span className="text-base font-black text-purple-700 block">{stats?.citizenEngagement?.verifiedContributions || 0}</span>
                      <span className="text-[10px] font-bold text-purple-700 uppercase">Verified Reports</span>
                    </div>
                    <div className="p-2">
                      <span className="text-base font-black text-emerald-700 block">{stats?.citizenEngagement?.totalPointsAwarded || 0}</span>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Points Awarded</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Top Contributors</span>
                    {(stats?.citizenEngagement?.topContributors || []).map((c, i) => (
                      <div key={c.id || i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-extrabold text-slate-900">{c.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 font-mono">
                          {c.verifiedReports} verified reports
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LEVEL 8: Waste Category Trends Over Time (Full width) */}
              <div className="civic-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Waste Category Trends</h3>
                    <p className="text-[11px] text-slate-500">Historical trend lines per waste classification</p>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.categoryTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px", pt: "10px" }} />
                      <Line type="monotone" dataKey="Plastic" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Organic" stroke="#059669" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="E-Waste" stroke="#9333ea" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Metal" stroke="#475569" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Mixed" stroke="#64748b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="civic-card p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Waste Report Management</h3>
                  <p className="text-xs text-slate-500">Inspect, verify, assign, and clear community waste reports</p>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, location..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-600 text-xs font-medium"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 font-semibold focus:outline-none text-xs"
                  >
                    <option value="all">All Categories</option>
                    {Object.keys(CATEGORY_COLORS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 font-semibold focus:outline-none text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 font-semibold focus:outline-none text-xs"
                  >
                    <option value="all">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="pb-3">ID & Category</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Priority</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Reporter</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center space-x-2.5">
                            {report.imageUrl && (
                              <img
                                src={report.imageUrl.startsWith("http") ? report.imageUrl : `${API_URL}${report.imageUrl}`}
                                alt="Report"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              />
                            )}
                            <div>
                              <span className="font-extrabold text-slate-900 block">#{report.id.substring(0, 6)}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{report.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 max-w-xs truncate">{report.address || "Geo-tagged"}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            report.priority === "Critical" ? "bg-red-100 text-red-800 border-red-300" :
                            report.priority === "High" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {report.priority || "Medium"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            report.status === "Completed" || report.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {report.status === "Completed" ? "Resolved" : report.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">{report.reporterName || "Citizen"}</td>
                        <td className="py-3 text-right space-x-1">
                          {!report.isVerified && report.status !== "Rejected" && (
                            <button
                              onClick={() => openReviewModal(report)}
                              className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[10px] rounded-lg cursor-pointer"
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Waste Hotspot Density & Cluster Map</h3>
                  <p className="text-xs text-slate-500">Geographic distribution of waste hazards</p>
                </div>
              </div>
              <div className="h-[600px] rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Map
                  reports={filteredReports}
                  hotspots={stats?.allHotspots || []}
                  center={mapCenter}
                  zoom={mapZoom}
                  showSearch={true}
                  isAdmin={true}
                  onQuickAssign={(report) => {
                    setSelectedReport(report);
                    setIsDetailModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === "workers" && (
            <div className="civic-card p-6 space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">Field Sanitation Workers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((w) => (
                  <div key={w.id} className="p-4 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                        {w.name ? w.name[0] : "W"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{w.name}</h4>
                        <p className="text-[10px] text-slate-500">{w.phone || "+91 Sanitation Team"}</p>
                      </div>
                    </div>
                    <div className="text-xs pt-2 border-t border-slate-200 flex justify-between">
                      <span>Tasks Assigned: <strong className="text-slate-900">{w.tasksAssigned || 0}</strong></span>
                      <span className="text-emerald-700 font-bold">★ {w.rating || "5.0"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detailed Report Inspection Modal */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        workers={workers}
        onReportUpdated={(updated) => {
          setSelectedReport(updated);
          fetchData();
        }}
      />

      {/* ── Review Modal (Verify / Reject) ── */}
      {isReviewModalOpen && reviewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Review Waste Report</h3>
                  <p className="text-[11px] text-slate-500">Inspect the report, then verify or reject it</p>
                </div>
              </div>
              <button
                onClick={closeReviewModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Report Details */}
            <div className="p-6 space-y-5">
              {/* Image + Basic Info */}
              <div className="flex items-start space-x-4">
                {reviewReport.imageUrl && (
                  <img
                    src={reviewReport.imageUrl.startsWith("http") ? reviewReport.imageUrl : `${API_URL}${reviewReport.imageUrl}`}
                    alt="Report evidence"
                    className="w-28 h-28 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 text-sm">#{reviewReport.id.substring(0, 6)}</span>
                    <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px]">
                      {reviewReport.category}
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                      reviewReport.priority === "Critical" ? "bg-red-50 text-red-700 border-red-200" :
                      reviewReport.priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {reviewReport.priority || "Medium"} Priority
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p className="flex items-center space-x-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{reviewReport.address || "Geo-tagged location"}</span>
                    </p>
                    <p><span className="text-slate-400">Reporter:</span> <span className="font-bold text-slate-800">{reviewReport.reporterName || "Citizen"}</span></p>
                    <p><span className="text-slate-400">Submitted:</span> <span className="font-mono">{reviewReport.createdAt ? new Date(reviewReport.createdAt).toLocaleDateString() : "—"}</span></p>
                    <p><span className="text-slate-400">Status:</span> <span className="font-bold text-slate-800">{reviewReport.status}</span></p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {reviewReport.description && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Citizen's Description</span>
                  {reviewReport.description}
                </div>
              )}

              {/* AI Confidence */}
              {reviewReport.aiConfidence && (
                <div className="flex items-center space-x-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600">AI Classification Confidence:</span>
                  <span className="font-bold text-emerald-700">{Math.round(reviewReport.aiConfidence * 100)}%</span>
                </div>
              )}

              {/* ── Choose Action ── */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700">Choose an action:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReviewAction("verify")}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                      reviewAction === "verify"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                    Verify Report
                    <p className="text-[10px] font-normal mt-0.5 opacity-80">+5 points awarded to citizen</p>
                  </button>
                  <button
                    onClick={() => setReviewAction("reject")}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                      reviewAction === "reject"
                        ? "bg-red-600 border-red-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:border-red-400 hover:bg-red-50"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                    Reject Report
                    <p className="text-[10px] font-normal mt-0.5 opacity-80">Mark as invalid or duplicate</p>
                  </button>
                </div>

                {/* Rejection reason (shown only when reject selected) */}
                {reviewAction === "reject" && (
                  <div className="animate-fade-in">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Rejection Reason <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Image does not show waste, location is invalid, duplicate report..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <button
                onClick={closeReviewModal}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={!reviewAction || submittingAction}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-xs cursor-pointer disabled:opacity-40 transition-all ${
                  reviewAction === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submittingAction
                  ? "Processing..."
                  : reviewAction === "reject"
                  ? "Confirm Rejection"
                  : reviewAction === "verify"
                  ? "Confirm Verification"
                  : "Select an Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
