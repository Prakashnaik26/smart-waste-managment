import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "./Map";
import {
  X, CheckCircle, Clock, MapPin, AlertTriangle, User, MessageSquare,
  Send, ShieldCheck, Camera, CheckSquare, Upload, ArrowRight, FileText, ChevronRight
} from "lucide-react";

export const ReportDetailModal = ({
  report,
  isOpen,
  onClose,
  onReportUpdated,
  workers = []
}) => {
  const { user, token, API_URL } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Status/Resolution form state
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [resolutionPhotoPreview, setResolutionPhotoPreview] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  if (!isOpen || !report) return null;

  const isAdmin = user?.role === "admin";
  const isWorker = user?.role === "worker";

  const imgUrl = report.imageUrl
    ? report.imageUrl.startsWith("http")
      ? report.imageUrl
      : `${API_URL}${report.imageUrl}`
    : null;

  const resolutionImgUrl = report.completionPhotoUrl
    ? report.completionPhotoUrl.startsWith("http")
      ? report.completionPhotoUrl
      : `${API_URL}${report.completionPhotoUrl}`
    : null;

  // Status Steps Lifecycle Order
  const STATUS_STEPS = ["Submitted", "Verified", "Assigned", "In Progress", "Completed"];
  const currentStatus = report.status === "resolved" ? "Completed" : report.status;
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus) >= 0 
    ? STATUS_STEPS.indexOf(currentStatus) 
    : (currentStatus === "Submitted" ? 0 : 1);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${report.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText.trim() })
      });

      if (res.ok) {
        const newComment = await res.json();
        setCommentText("");
        if (onReportUpdated) {
          onReportUpdated({
            ...report,
            comments: [...(report.comments || []), newComment]
          });
        }
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVerify = async () => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${report.id}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && onReportUpdated) {
        onReportUpdated(data);
      }
    } catch (e) {
      console.error("Error verifying report:", e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    const workerObj = workers.find(w => w.id === selectedWorkerId);
    if (!workerObj) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${report.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          workerId: workerObj.id,
          workerName: workerObj.name
        })
      });
      const data = await res.json();
      if (res.ok && onReportUpdated) {
        onReportUpdated(data);
      }
    } catch (e) {
      console.error("Error assigning worker:", e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResolveStatus = async (targetStatus) => {
    setSubmittingAction(true);
    try {
      const formData = new FormData();
      formData.append("status", targetStatus);
      if (resolutionNote) formData.append("resolutionNote", resolutionNote);
      if (resolutionPhoto) formData.append("completionPhoto", resolutionPhoto);

      const res = await fetch(`${API_URL}/api/reports/${report.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && onReportUpdated) {
        onReportUpdated(data);
        setResolutionPhoto(null);
        setResolutionPhotoPreview(null);
        setResolutionNote("");
      }
    } catch (e) {
      console.error("Error updating status:", e);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm">
              #{report.id ? report.id.substring(0, 6) : "RPT"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-900">{report.category} Waste Report</h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  report.status === "Completed" || report.status === "resolved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : report.status === "Verified"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : report.status === "Assigned" || report.status === "In Progress"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  {report.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                <span>📍 {report.address || "Geo-tagged Location"}</span>
                <span>•</span>
                <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ""}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Progress Lifecycle */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Report Resolution Progress</p>
            <div className="grid grid-cols-5 gap-2 relative">
              {STATUS_STEPS.map((stepName, idx) => {
                const isDone = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={stepName} className="flex flex-col items-center text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                      isDone
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-500"
                    } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className={`text-[11px] font-semibold ${
                      isDone ? "text-slate-900 font-bold" : "text-slate-400"
                    }`}>
                      {stepName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Media & Images Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Submitted Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Report Evidence (Before)</span>
                </span>
                {report.aiConfidence && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                    AI Confidence: {Math.round(report.aiConfidence * 100)}%
                  </span>
                )}
              </div>
              <div className="h-56 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                {imgUrl ? (
                  <img src={imgUrl} alt="Reported Waste" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Photo (Proof of Cleanliness) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resolution Proof (After)</span>
                </span>
                {report.resolvedAt && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Resolved {new Date(report.resolvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="h-56 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                {resolutionImgUrl ? (
                  <img src={resolutionImgUrl} alt="Resolution Evidence" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Pending Resolution Proof</p>
                    <p className="text-[11px] text-slate-400 mt-1">Resolution photo will be uploaded once municipal teams complete clean-up.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details & Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left metadata details */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Report Description & Parameters</h4>
              
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans">
                {report.description || "No additional description provided by citizen reporter."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Reporter</p>
                  <p className="font-bold text-slate-800 mt-0.5">{report.reporterName || "Citizen"}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Severity</p>
                  <p className="font-bold text-slate-800 mt-0.5">{report.severity || "Medium"}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Priority</p>
                  <p className="font-bold text-slate-800 mt-0.5">{report.priority || "Medium"}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Supporters</p>
                  <p className="font-bold text-emerald-700 mt-0.5">{report.supportCount || 1} Citizens</p>
                </div>
              </div>

              {report.resolutionNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <p className="font-bold text-emerald-900 mb-0.5">Resolution Notes:</p>
                  <p className="text-emerald-800">{report.resolutionNote}</p>
                </div>
              )}
            </div>

            {/* Right mini map */}
            <div className="h-full min-h-[180px] rounded-xl border border-slate-200 overflow-hidden relative">
              <Map
                reports={[report]}
                center={[report.lat || 12.9716, report.lng || 77.5946]}
                zoom={14}
                showSearch={false}
              />
            </div>
          </div>

          {/* Admin / Worker Action Controls Panel */}
          {(isAdmin || isWorker) && (
            <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Municipal Operational Controls</span>
                </span>
                <span className="text-[11px] text-slate-400">Role: {user.role}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                {/* Admin Verify & Assign */}
                {isAdmin && (
                  <div className="space-y-3 bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-200">1. Verification & Worker Assignment</p>
                    
                    {!report.isVerified ? (
                      <button
                        onClick={handleVerify}
                        disabled={submittingAction}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Verify Report (+5 Citizen Bonus)
                      </button>
                    ) : (
                      <p className="text-purple-400 font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 inline" /> <span>Report Verified</span>
                      </p>
                    )}

                    {workers.length > 0 && (
                      <div className="flex items-center space-x-2 pt-1">
                        <select
                          value={selectedWorkerId}
                          onChange={(e) => setSelectedWorkerId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
                        >
                          <option value="">Select Field Worker...</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.phone || "Sanitation"})</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignWorker}
                          disabled={!selectedWorkerId || submittingAction}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Update & Resolution Photo Upload */}
                <div className="space-y-3 bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                  <p className="font-bold text-slate-200">2. Complete Resolution & Proof Upload</p>

                  <div className="space-y-2">
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Add completion notes or work summary..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
                    />

                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="resolution-file-input"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setResolutionPhoto(e.target.files[0]);
                            setResolutionPhotoPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                      />
                      <label
                        htmlFor="resolution-file-input"
                        className="flex-1 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium text-[11px] cursor-pointer text-center truncate"
                      >
                        {resolutionPhoto ? resolutionPhoto.name : "📷 Upload Proof Photo"}
                      </label>

                      <button
                        onClick={() => handleResolveStatus("Completed")}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Audit History */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Status Audit History</h4>
            <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2 text-xs">
              {(report.statusHistory || []).map((h, i) => (
                <div key={i} className="relative pb-2 last:pb-0">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{h.status}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{h.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comment Thread */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Community Comments & Updates</span>
            </h4>

            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {(!report.comments || report.comments.length === 0) ? (
                <p className="text-xs text-slate-400 py-2 text-center">No comments yet. Start the conversation below.</p>
              ) : (
                report.comments.map((c) => (
                  <div key={c.id || Math.random()} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{c.userName || "Citizen"}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-slate-600">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write an update or comment..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
