import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "../components/Map";
import { NotificationBell } from "../components/NotificationBell";
import { ReportDetailModal } from "../components/ReportDetailModal";
import {
  LogOut, Hammer, Users, Clock, CheckCircle, AlertCircle, 
  MapPin, Award, Loader2, Sparkles, User, Camera, Calendar, 
  Send, Compass, CheckSquare, MessageSquare, Plus, X, ListTodo
} from "lucide-react";

export const WorkerDashboard = () => {
  const { user, logout, token, refreshUser, updateProfile, API_URL } = useAuth();
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
    } fontally: {
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

      if (res.ok) {
        setLogMessage("Work log submitted successfully!");
        setAreaWorked("");
        setLogSummary("");
        setLogChallenges("");
        fetchData();
      }
    } catch (err) {
      setLogMessage(err.message || "Failed to submit work log.");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Assigned tasks for current worker or open tasks
  const assignedTasks = reports.filter(
    r => r.assignedWorkerId === user?.id || (r.status !== "Completed" && r.status !== "resolved")
  );

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
          <nav className="space-y-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "tasks" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>Assigned Hazards ({assignedTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "logs" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Daily Work Logs</span>
            </button>
          </nav>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3 font-mono">
            Sanitation Field App
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === "tasks" && (
            <div className="civic-card p-6 space-y-5">
              <h3 className="font-extrabold text-base text-slate-900">Sanitation Task Queue</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedTasks.map((task) => (
                  <div key={task.id} className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 hover:border-emerald-500 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">#{task.id.substring(0, 6)} — {task.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
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

                    <p className="text-xs text-slate-600 line-clamp-1">📍 {task.address}</p>

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
            </div>
          )}

          {activeTab === "logs" && (
            <div className="max-w-2xl mx-auto civic-card p-6 space-y-5">
              <h3 className="font-extrabold text-base text-slate-900">Submit Daily Work Log</h3>
              {logMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                  {logMessage}
                </div>
              )}
              <form onSubmit={handleCreateLog} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hours Worked Today</label>
                  <input
                    type="number"
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
                    placeholder="Summarize cleared hazards..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Log
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
