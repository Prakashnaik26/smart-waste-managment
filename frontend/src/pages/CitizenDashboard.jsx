import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "../components/Map";
import { ReportModal } from "../components/ReportModal";
import { ReportDetailModal } from "../components/ReportDetailModal";
import { NotificationBell } from "../components/NotificationBell";
import {
  Menu, X, User, MapPin, Award, Compass, ShoppingCart,
  MessageSquare, Clock, Send, ChevronRight, BarChart2,
  CheckCircle2, AlertCircle, ShoppingBag, Trophy, Loader2, LogOut, Plus, ShieldCheck, FileText, ExternalLink
} from "lucide-react";

export const CitizenDashboard = () => {
  const { user, logout, token, refreshUser, updateProfile, API_URL } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation & Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, reports, map, profile
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isPointsAuditOpen, setIsPointsAuditOpen] = useState(false);

  // Selected Report for Detailed View Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Rewards & Leaderboard State
  const [catalog, setCatalog] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [redeemingId, setRedeemingId] = useState(null);
  const [rewardMessage, setRewardMessage] = useState("");

  // Profile Form
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [selectedMapCoords, setSelectedMapCoords] = useState(null);

  useEffect(() => {
    fetchReports();
    fetchCatalog();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rewards/catalog`);
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (err) {
      console.error("Error fetching rewards catalog:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const citizens = data.filter(u => u.role === "citizen");
        citizens.sort((a, b) => (b.points || 0) - (a.points || 0));
        setLeaderboard(citizens);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const handleRedeemProduct = async (productId) => {
    setRedeemingId(productId);
    setRewardMessage("");
    try {
      const res = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");

      setRewardMessage(data.message);
      if (refreshUser) refreshUser();
    } catch (err) {
      setRewardMessage(err.message || "Failed to redeem reward");
    } finally {
      setRedeemingId(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMessage("");
    try {
      await updateProfile({ name: profileName, phone: profilePhone });
      setProfileMessage("Profile updated successfully!");
    } catch (err) {
      setProfileMessage(err.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Filtered reports for current user
  const myReports = reports.filter(r => r.userId === user?.id);
  const pendingCount = myReports.filter(r => r.status !== "Completed" && r.status !== "resolved").length;
  const resolvedCount = myReports.filter(r => r.status === "Completed" || r.status === "resolved").length;
  const verifiedCount = myReports.filter(r => r.isVerified || r.status === "Verified").length;

  // Citizen Reputation Calculation
  const accuracyRate = myReports.length > 0 ? Math.round((verifiedCount / myReports.length) * 100) : 100;
  let reputationTier = "New Contributor";
  if (user?.points >= 300) reputationTier = "Community Champion";
  else if (user?.points >= 150) reputationTier = "Trusted Contributor";
  else if (user?.points >= 50) reputationTier = "Active Contributor";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
            E
          </div>
          <span className="font-extrabold text-slate-900 text-sm hidden sm:inline">EcoSort Citizen Portal</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Points Badge */}
          <button
            onClick={() => setIsPointsAuditOpen(true)}
            className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{user?.points || 0} Pts</span>
          </button>

          {/* Notification Bell */}
          <NotificationBell
            onSelectReport={(reportId) => {
              const matched = reports.find(r => r.id === reportId);
              if (matched) {
                setSelectedReport(matched);
                setIsDetailModalOpen(true);
              }
            }}
          />

          {/* Quick Report CTA */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Waste</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Desktop) */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col justify-between p-4">
          <div className="space-y-6">
            {/* Citizen Profile Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                  {user?.name ? user.name[0] : "C"}
                </div>
                <div>
                  <p className="font-extrabold text-xs text-slate-900">{user?.name}</p>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full block mt-0.5">
                    {reputationTier}
                  </span>
                </div>
              </div>
            </div>

            {/* Nav Menu Items */}
            <nav className="space-y-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Dashboard Summary</span>
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>My Waste Reports ({myReports.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("map")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "map"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Waste Hazard Map</span>
              </button>

              <button
                onClick={() => setIsRewardsOpen(true)}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Rewards Catalog</span>
              </button>

              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Profile Settings</span>
              </button>
            </nav>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3 font-mono">
            EcoSort Platform V2
          </div>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="civic-card p-5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">My Total Reports</span>
                  <span className="text-2xl md:text-3xl font-black text-slate-900 mt-1 block">{myReports.length}</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Submitted hazards</span>
                </div>

                <div className="civic-card p-5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Resolution</span>
                  <span className="text-2xl md:text-3xl font-black text-amber-600 mt-1 block">{pendingCount}</span>
                  <span className="text-[11px] text-amber-700 mt-1 block">In municipal queue</span>
                </div>

                <div className="civic-card p-5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Resolved Hazards</span>
                  <span className="text-2xl md:text-3xl font-black text-emerald-700 mt-1 block">{resolvedCount}</span>
                  <span className="text-[11px] text-emerald-600 mt-1 block">Proof of clean-up</span>
                </div>

                <div className="civic-card p-5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Points Balance</span>
                  <span className="text-2xl md:text-3xl font-black text-slate-900 mt-1 block">{user?.points || 0}</span>
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 block flex items-center cursor-pointer" onClick={() => setIsPointsAuditOpen(true)}>
                    View Audit Log →
                  </span>
                </div>
              </div>

              {/* Reputation & Contribution Banner */}
              <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                    Citizen Standing
                  </span>
                  <h3 className="text-xl font-extrabold">{reputationTier}</h3>
                  <p className="text-xs text-slate-300">
                    {verifiedCount} Verified Reports • {accuracyRate}% Verified Accuracy Rate
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    + Report Waste
                  </button>
                  <button
                    onClick={() => setIsRewardsOpen(true)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
                  >
                    Redeem Points
                  </button>
                </div>
              </div>

              {/* Recent Reports List */}
              <div className="civic-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Recent Waste Reports</h3>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    View All ({myReports.length}) →
                  </button>
                </div>

                {myReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No waste reports submitted yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "Report Waste" to submit your first geo-tagged report.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                          <th className="pb-3">Hazard</th>
                          <th className="pb-3">Category</th>
                          <th className="pb-3">Location</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Priority</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {myReports.slice(0, 5).map((report) => (
                          <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center space-x-2.5">
                                {report.imageUrl && (
                                  <img
                                    src={report.imageUrl.startsWith("http") ? report.imageUrl : `${API_URL}${report.imageUrl}`}
                                    alt="Hazard"
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                                  />
                                )}
                                <span className="font-bold text-slate-900">#{report.id.substring(0, 6)}</span>
                              </div>
                            </td>
                            <td className="py-3 font-semibold text-slate-800">{report.category}</td>
                            <td className="py-3 text-slate-600 max-w-xs truncate">{report.address || "Geo-tagged"}</td>
                            <td className="py-3 text-slate-500 font-mono text-[11px]">
                              {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ""}
                            </td>
                            <td className="py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                report.priority === "High"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {report.priority || "Medium"}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                report.status === "Completed" || report.status === "resolved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : report.status === "Verified"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="civic-card p-6 space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">All Submitted Waste Reports</h3>
              <div className="space-y-3">
                {myReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report);
                      setIsDetailModalOpen(true);
                    }}
                    className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 transition-all cursor-pointer bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3">
                      {report.imageUrl && (
                        <img
                          src={report.imageUrl.startsWith("http") ? report.imageUrl : `${API_URL}${report.imageUrl}`}
                          alt="Report"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">#{report.id.substring(0, 6)} — {report.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            report.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">📍 {report.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-400 font-mono">{new Date(report.createdAt).toLocaleDateString()}</span>
                      <button className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">Community Waste Map</h3>
              <div className="h-[550px] rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Map reports={reports} center={[12.9716, 77.5946]} zoom={12} showSearch={true} />
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-xl mx-auto civic-card p-6 space-y-5">
              <h3 className="font-extrabold text-base text-slate-900">My Profile Settings</h3>
              {profileMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                  {profileMessage}
                </div>
              )}
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reports={reports}
        onReportAdded={() => fetchReports()}
      />

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onReportUpdated={(updated) => {
          setSelectedReport(updated);
          fetchReports();
        }}
      />

      {/* Rewards Catalog Modal */}
      {isRewardsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Eco Rewards Catalog</h3>
              <button onClick={() => setIsRewardsOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {rewardMessage && <div className="p-3 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl">{rewardMessage}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-1">
              {catalog.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2 bg-slate-50/50">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-28 w-full object-cover rounded-lg" />}
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{item.name}</h4>
                    <span className="text-[11px] font-bold text-emerald-700">{item.pointCost} Points</span>
                  </div>
                  <button
                    onClick={() => handleRedeemProduct(item.id)}
                    disabled={user?.points < item.pointCost || redeemingId === item.id}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-40"
                  >
                    Redeem
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-auto flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Community Leaderboard</span>
              </h3>
              <button onClick={() => setIsLeaderboardOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {leaderboard.map((c, idx) => (
                <div key={c.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      idx === 0 ? "bg-amber-400 text-amber-950" : idx === 1 ? "bg-slate-300 text-slate-800" : "bg-amber-700 text-white"
                    }`}>{idx + 1}</span>
                    <span className="font-extrabold text-slate-900">{c.name}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">{c.points || 0} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Points Audit Modal */}
      {isPointsAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-auto flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Points Transaction History</span>
              </h3>
              <button onClick={() => setIsPointsAuditOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
              {(!user?.pointsHistory || user.pointsHistory.length === 0) ? (
                <p className="text-slate-400 text-center py-4">No points history transactions yet.</p>
              ) : (
                user.pointsHistory.map((tx, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{tx.reason}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                    <span className={`font-mono font-extrabold ${tx.amount > 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
