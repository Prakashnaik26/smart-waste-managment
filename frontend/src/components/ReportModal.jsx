import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Map } from "./Map";
import {
  Camera, MapPin, X, Award, CheckCircle, Sparkles, Loader2, AlertTriangle, ShieldCheck, Upload, ArrowRight, ArrowLeft
} from "lucide-react";

const CATEGORIES = [
  "Plastic",
  "Organic",
  "Paper",
  "Cardboard",
  "Metal",
  "Glass",
  "E-Waste",
  "Hazardous",
  "Mixed"
];

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

export const ReportModal = ({
  isOpen,
  onClose,
  reports = [],
  onReportAdded,
  selectedLocation,
  clearSelectedLocation
}) => {
  const { token, refreshUser, API_URL } = useAuth();

  // Step State (1: Photo Upload, 2: AI Classification, 3: GPS & Address, 4: Details & Duplicate Search, 5: Success)
  const [step, setStep] = useState(1);

  // Form State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [geoStatus, setGeoStatus] = useState("idle");

  // AI State
  const [aiStatus, setAiStatus] = useState("idle");
  const [predictedCategory, setPredictedCategory] = useState("Mixed");
  const [confidence, setConfidence] = useState(0.85);
  const [confidenceLevel, setConfidenceLevel] = useState("High");
  const [aiRecommendation, setAiRecommendation] = useState("");
  const [finalCategory, setFinalCategory] = useState("Plastic");

  // Details State
  const [severity, setSeverity] = useState("Medium");
  const [wasteSize, setWasteSize] = useState("Medium");
  const [description, setDescription] = useState("");

  // Duplicate Check State
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      detectLocation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedLocation) {
      setLat(selectedLocation.lat.toFixed(5));
      setLng(selectedLocation.lng.toFixed(5));
      setGeoStatus("success");
      reverseGeocode(selectedLocation.lat, selectedLocation.lng);
    }
  }, [selectedLocation]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(5);
        const longitude = position.coords.longitude.toFixed(5);
        setLat(latitude);
        setLng(longitude);
        setGeoStatus("success");
        reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.warn("Geolocation failed:", err.message);
        setGeoStatus("error");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(",");
          setAddress(parts.slice(0, 3).join(","));
          return;
        }
      }
      setAddress(`Point near ${latitude}, ${longitude}`);
    } catch (e) {
      console.error(e);
      setAddress(`Point near ${latitude}, ${longitude}`);
    }
  };

  const handleImageChange = (file) => {
    if (!file) return;
    // Validate type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file size must be less than 10MB.");
      return;
    }

    setErrorMessage("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Run AI classification simulation with heuristics
    runAIClassification(file);
  };

  const runAIClassification = (file) => {
    setAiStatus("classifying");
    const name = file.originalname || file.name || "";
    const lowerName = name.toLowerCase();

    let cat = "Plastic";
    let conf = 0.94;
    let level = "High";
    let rec = "";

    if (lowerName.includes("bottle") || lowerName.includes("plastic") || lowerName.includes("bag") || lowerName.includes("pet")) {
      cat = "Plastic";
      conf = 0.94;
    } else if (lowerName.includes("apple") || lowerName.includes("food") || lowerName.includes("banana") || lowerName.includes("organic") || lowerName.includes("leaf")) {
      cat = "Organic";
      conf = 0.92;
    } else if (lowerName.includes("phone") || lowerName.includes("battery") || lowerName.includes("cable") || lowerName.includes("wire") || lowerName.includes("electronic")) {
      cat = "E-Waste";
      conf = 0.95;
    } else if (lowerName.includes("can") || lowerName.includes("metal") || lowerName.includes("tin")) {
      cat = "Metal";
      conf = 0.91;
    } else if (lowerName.includes("paper") || lowerName.includes("news")) {
      cat = "Paper";
      conf = 0.88;
    } else if (lowerName.includes("box") || lowerName.includes("cardboard")) {
      cat = "Cardboard";
      conf = 0.89;
    } else {
      cat = "Mixed";
      conf = 0.78;
      level = "Medium";
    }

    if (conf >= 0.90) level = "High";
    else if (conf >= 0.70) level = "Medium";
    else level = "Low";

    if (level === "High") rec = `AI Classification: ${cat} (${Math.round(conf * 100)}% confidence)`;
    else if (level === "Medium") rec = `AI Suggests: ${cat} (${Math.round(conf * 100)}% confidence). Please confirm.`;
    else rec = "Unable to confidently classify. Please select manually.";

    setTimeout(() => {
      setPredictedCategory(cat);
      setConfidence(conf);
      setConfidenceLevel(level);
      setAiRecommendation(rec);
      setFinalCategory(cat);
      setAiStatus("done");
    }, 600);
  };

  const checkForDuplicates = async () => {
    if (!lat || !lng) return;
    setCheckingDuplicate(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/check-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, category: finalCategory })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isDuplicate) {
          setDuplicateData(data);
        } else {
          setDuplicateData(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleSupportExisting = async (reportId) => {
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}/support`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (refreshUser) refreshUser();
        if (onReportAdded) onReportAdded();
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!lat || !lng) {
      setErrorMessage("Please set a valid geo-tagged location on the map.");
      return;
    }
    if (!imageFile && !imagePreview) {
      setErrorMessage("Please upload a waste photo.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      }
      formData.append("lat", lat);
      formData.append("lng", lng);
      formData.append("address", address || "Geo-tagged location");
      formData.append("finalCategory", finalCategory);
      formData.append("severity", severity);
      formData.append("wasteSize", wasteSize);
      formData.append("description", description);

      const res = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to submit waste report.");
      }

      setSuccessData(data);
      if (refreshUser) refreshUser();
      if (onReportAdded) onReportAdded(data);
      setStep(5);
    } catch (e) {
      setErrorMessage(e.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setLat("");
    setLng("");
    setAddress("");
    setPredictedCategory("Mixed");
    setFinalCategory("Plastic");
    setDescription("");
    setDuplicateData(null);
    setSuccessData(null);
    setErrorMessage("");
    if (clearSelectedLocation) clearSelectedLocation();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              +
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Report Waste Hazard</h3>
              <p className="text-[11px] text-slate-500">Step {step} of 4 — Verified Civic Report</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step < 5 && (
          <div className="w-full bg-slate-100 h-1 flex">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload Image */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">Capture Waste Evidence</h4>
                <p className="text-xs text-slate-500">Upload a clear photo of the waste accumulation.</p>
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-emerald-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageChange(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                {imagePreview ? (
                  <div className="space-y-3">
                    <img src={imagePreview} alt="Preview" className="max-h-56 mx-auto rounded-xl shadow-xs border border-slate-200" />
                    <p className="text-xs font-semibold text-emerald-700">✓ Photo attached ({imageFile?.name})</p>
                    <p className="text-[10px] text-slate-400">Click or drag to change image</p>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Click to upload or drag & drop</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG, WEBP up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={!imagePreview}
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue to AI Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI Classification & Manual Confirmation */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">AI Category Verification</h4>
                <p className="text-xs text-slate-500">Confirm or adjust the suggested waste category.</p>
              </div>

              {aiStatus === "classifying" ? (
                <div className="p-8 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Analyzing waste characteristics...</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">AI Suggested Category</span>
                      <p className="font-black text-lg text-slate-900">{predictedCategory}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        confidenceLevel === "High"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {confidenceLevel} Confidence ({Math.round(confidence * 100)}%)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl font-medium">
                    ✨ {aiRecommendation}
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Confirm Final Category</label>
                    <select
                      value={finalCategory}
                      onChange={(e) => setFinalCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>Set Geo-Location</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Geo-Tagging & Map Pin */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">Geo-Tagging Location</h4>
                <p className="text-xs text-slate-500">Drag map pin to pinpoint exact hazard position.</p>
              </div>

              <div className="h-60 rounded-2xl border border-slate-200 overflow-hidden relative">
                <Map
                  selectedLocation={lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null}
                  onMapClick={(coords) => {
                    setLat(coords.lat.toFixed(5));
                    setLng(coords.lng.toFixed(5));
                  }}
                  onAddressResolved={(addr) => setAddress(addr)}
                  center={[parseFloat(lat) || 12.9716, parseFloat(lng) || 77.5946]}
                  zoom={14}
                  showSearch={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Latitude</span>
                  <p className="font-mono font-bold text-slate-900">{lat || "Not set"}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Longitude</span>
                  <p className="font-mono font-bold text-slate-900">{lng || "Not set"}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Street Address / Landmark</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Bus Station, MG Road"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 mt-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => {
                    checkForDuplicates();
                    setStep(4);
                  }}
                  disabled={!lat || !lng}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Report Details & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Details & Duplicate Check */}
          {step === 4 && (
            <div className="space-y-4">
              {duplicateData && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-start space-x-2 text-amber-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>Similar waste report found nearby ({duplicateData.distanceMeters}m away)!</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Instead of submitting a duplicate, you can support this existing report to earn +3 points and help prioritize it.
                  </p>
                  <button
                    onClick={() => handleSupportExisting(duplicateData.nearbyReport.id)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Support Nearby Report (+3 Pts)
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hazard Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    {SEVERITIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Waste Volume Size</label>
                  <select
                    value={wasteSize}
                    onChange={(e) => setWasteSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Small">Small (Single Bag/Can)</option>
                    <option value="Medium">Medium (Multiple Bags)</option>
                    <option value="Large">Large (Piled Dumpster)</option>
                    <option value="Severe">Severe (Blockade Hazard)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Description & Context</label>
                  <span className="text-[10px] text-slate-400 font-mono">{description.length}/500</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Describe location details, landmark, or blockage..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Waste Report</span>
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Screen */}
          {step === 5 && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-md">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-xl">Waste Report Submitted!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Thank you for contributing to your community clean environment. Your report has been dispatched to municipal administrators.
                </p>
              </div>

              {successData && (
                <div className="inline-flex items-center space-x-3 bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-2xl text-emerald-900 text-xs font-bold">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>+5 Citizen Points Awarded! (Total: {successData.totalPoints} pts)</span>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={() => { resetForm(); onClose(); }}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
