import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "../components/Map";
import { NotificationBell } from "../components/NotificationBell";
import { ReportDetailModal } from "../components/ReportDetailModal";
import {
  LogOut, Hammer, Clock, CheckCircle, AlertCircle, 
  MapPin, Loader2, User, Calendar, 
  Send, ListTodo, Compass
} from "lucide-react";

export const WorkerDashboard = () => {
  const { user, logout, token, updateProfile, API_URL } = useAuth();
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState("tasks"); // tasks, logs, profile
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Daily log inputs
  const [hoursWorked, setHoursWorked] = useState("8");
  const [areaWorked, setAreaWorked] = useState("");
  const [logSummary, setLogSummary] = useState("");
  const [logChallenges, setLogChallenges] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logMessage, setLogMessage] = useState("");

  // Profile Edit
  const [workerName, setWorkerName] = useState(user?.name || "");
  const [workerPhone, setWorkerPhone] = useState(user?.phone || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setWorkerName(user.name || "");
      setWorkerPhone(user.phone || "");
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [reportsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports`),
        fetch(`${API_URL}/api/logs`, { headers })
      ]);

      if (reportsRes.ok && logsRes.ok) {
        const reportsData = await reportsRes.json();
        const logsData = await logsRes.json();
        setReports(reportsData);
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Error loading worker dashboard:", err);
    } finally {
      // Fixed: was "fontally:" — critical syntax error that crashed the entire Worker dashboard
      setLoading(false);
    }
  };

  const handleCreateLog = async (e) => {
    e.preventDefault();
    setSubmittingLog(true);
    setLogMessage("");
    try {
      const res = await fetch(`${API_URL}/api/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hoursWorked: parseFloat(hoursWorked),
          areaWorked,
          summary: logSummary,
          challenges: logChallenges
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLogMessage("Work log submitted successfully!");
        setAreaWorked("");
        setLogSummary("");
        setLogChallenges("");
        fetchData();
      } else {
        setLogMessage(data.error || "Failed to submit work log.");
      }
    } catch (err) {
      setLogMessage(err.message || "Failed to submit work log.");
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMessage("");
    try {
      await updateProfile({ name: workerName, phone: workerPhone });
      setProfileMessage("Profile updated successfully!");
    } catch (err) {
      setProfileMessage(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Fixed: Only show tasks explicitly assigned to this worker
  // (Previously showed ALL unresolved reports in the system — a major bug)
  const assignedTasks = reports.filter(
    r => r.assignedWorkerId === user?.id
  );

  const completedTasks = assignedTasks.filter(r => r.status === "Completed" || r.status === "resolved");
  const activeTasks = assignedTasks.filter(r => r.status !== "Completed" && r.status !== "resolved");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between px-6 md:px-8 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-slate-900 text-sm">Field Operations Portal</span>
            <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
              Sanitation Worker
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationBell
            onSelectReport={(reportId) => {
              const matched = reports.find(r => r.id === reportId);
              if (matched) {
                setSelectedTask(matched);
                setIsDetailModalOpen(true);
              }
            }}
          />

          <div className="flex items-center space-x-2 text-xs border-l border-slate-200 pl-4">
            <User className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-800">{user?.name || "Field Worker"}</span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col justify-between p-4">
          {/* Worker Summary */}
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {user?.name ? user.name[0] : "W"}
                </div>
                <div>
                  <p className="font-extrabold text-xs text-slate-900">{user?.name}</p>
                  <span className="text-[10px] text-slate-500">Rating: ★ {user?.rating || "5.0"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1 border-t border-slate-200">
                <div>
                  <p className="font-black text-emerald-700">{activeTasks.length}</p>
                  <p className="text-[10px] text-slate-500">Active</p>
                </div>
                <div>
                  <p className="font-black text-slate-700">{completedTasks.length}</p>
                  <p className="text-[10px] text-slate-500">Completed</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "tasks" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>My Assigned Tasks ({assignedTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("logs")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "logs" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Daily Work Logs ({logs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === "profile" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Profile Settings</span>
              </button>
            </nav>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3 font-mono">
            Sanitation Field App
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {/* TASKS TAB */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900">My Assigned Tasks</h3>
                <span className="text-xs font-bold text-slate-500">
                  {activeTasks.length} active · {completedTasks.length} completed
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                </div>
              ) : assignedTasks.length === 0 ? (
                <div className="civic-card p-12 text-center space-y-3">
                  <CheckCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600 text-sm">No tasks assigned yet</p>
                  <p className="text-xs text-slate-400">The admin will assign waste reports to you. Check back soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedTasks.map((task) => (
                    <div key={task.id} className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 hover:border-emerald-500 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">#{task.id.substring(0, 6)} — {task.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          task.status === "Completed" || task.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : task.status === "In Progress" || task.status === "Started"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      {task.imageUrl && (
                        <img
                          src={task.imageUrl.startsWith("http") ? task.imageUrl : `${API_URL}${task.imageUrl}`}
                          alt="Task"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200"
                        />
                      )}

                      <div className="space-y-1 text-xs text-slate-600">
                        <p>📍 {task.address || "Geo-tagged location"}</p>
                        <p className="text-slate-400 font-mono">
                          Severity: <span className="font-bold text-slate-600">{task.severity || "Medium"}</span>
                          {task.priority === "High" || task.priority === "Critical" ? (
                            <span className="ml-2 text-red-600 font-bold">⚠ {task.priority} Priority</span>
                          ) : null}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDetailModalOpen(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        Inspect & Resolve Task
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === "logs" && (
            <div className="space-y-5">
              {/* Submit new log */}
              <div className="max-w-2xl civic-card p-6 space-y-5">
                <h3 className="font-extrabold text-base text-slate-900">Submit Daily Work Log</h3>
                {logMessage && (
                  <div className={`p-3 border rounded-xl font-bold text-xs ${
                    logMessage.includes("success")
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    {logMessage}
                  </div>
                )}
                <form onSubmit={handleCreateLog} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hours Worked Today</label>
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Area / Ward Covered</label>
                    <input
                      type="text"
                      value={areaWorked}
                      onChange={(e) => setAreaWorked(e.target.value)}
                      placeholder="e.g. Ward 4, Central Market Area"
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Work Summary</label>
                    <textarea
                      value={logSummary}
                      onChange={(e) => setLogSummary(e.target.value)}
                      rows={3}
                      placeholder="Summarize cleared hazards and areas covered..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Challenges Faced (Optional)</label>
                    <textarea
                      value={logChallenges}
                      onChange={(e) => setLogChallenges(e.target.value)}
                      rows={2}
                      placeholder="Any obstacles, equipment issues, or public complaints..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingLog || !areaWorked.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingLog ? "Submitting..." : "Submit Daily Log"}
                  </button>
                </form>
              </div>

              {/* Past logs */}
              {logs.length > 0 && (
                <div className="max-w-2xl civic-card p-6 space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900">My Previous Logs ({logs.length})</h4>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/60 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-slate-900">{log.areaWorked || "Area not specified"}</span>
                          <span className="text-slate-400 font-mono">{log.date}</span>
                        </div>
                        <p className="text-slate-600">{log.summary || "No summary provided."}</p>
                        <p className="text-slate-500 mt-1">Hours: <strong>{log.hoursWorked}h</strong></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="max-w-xl mx-auto civic-card p-6 space-y-5">
              <h3 className="font-extrabold text-base text-slate-900">My Profile Settings</h3>
              {profileMessage && (
                <div className={`p-3 border rounded-xl font-bold text-xs ${
                  profileMessage.includes("success")
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {profileMessage}
                </div>
              )}
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    placeholder="+91 9988776655"
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Worker stats display */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">Performance Stats</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Rating</p>
                      <p className="font-extrabold text-amber-600">★ {user?.rating || "5.0"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Tasks Assigned</p>
                      <p className="font-extrabold text-slate-900">{user?.tasksAssigned || 0}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingProfile ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      <ReportDetailModal
        report={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onReportUpdated={(updated) => {
          setSelectedTask(updated);
          fetchData();
        }}
      />
    </div>
  );
};
