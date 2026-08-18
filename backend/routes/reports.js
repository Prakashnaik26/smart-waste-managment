const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db } = require("../config/firebase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { classifyWaste } = require("../utils/classifier");

// Setup Multer storage for uploaded waste images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/**
 * Haversine formula to compute distance in meters between two lat/lng pairs
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper to update user points and add transaction audit item
 */
async function awardUserPoints(userId, amount, reason) {
  if (!userId || amount === 0) return 0;
  const userDocRef = db.collection("users").doc(userId);
  const userDoc = await userDocRef.get();

  const now = new Date().toISOString();
  let currentPoints = 0;
  let history = [];

  if (userDoc.exists) {
    const userData = userDoc.data();
    currentPoints = userData.points || 0;
    history = userData.pointsHistory || [];
  }

  const updatedPoints = Math.max(0, currentPoints + amount);
  history.unshift({
    id: Math.random().toString(36).substring(2, 10),
    amount,
    reason,
    timestamp: now
  });

  if (userDoc.exists) {
    await userDocRef.update({
      points: updatedPoints,
      pointsHistory: history.slice(0, 50) // keep last 50 transactions
    });
  }
  return updatedPoints;
}

/**
 * Helper to dispatch in-app notifications
 */
async function createNotification({ userId, recipientRole, title, message, reportId, type = "info" }) {
  try {
    await db.collection("notifications").add({
      userId: userId || "",
      recipientRole: recipientRole || "",
      title,
      message,
      reportId: reportId || "",
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

// 1. Get All Reports (For Map display and Dashboards)
router.get("/", async (req, res) => {
  try {
    const reportsRef = db.collection("reports");
    const snapshot = await reportsRef.get();

    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by createdAt descending
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(reports);
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ error: "Server error fetching waste reports" });
  }
});

// 2. Proximity Check for Duplicate Reports (within 100m)
router.post("/check-duplicate", async (req, res) => {
  try {
    const { lat, lng, category } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Coordinates (lat, lng) required for duplicate check" });
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);

    const snapshot = await db.collection("reports").get();
    let nearbyReport = null;
    let minDistance = Infinity;

    snapshot.forEach((doc) => {
      const r = doc.data();
      // Only check unresolved/active reports
      const isUnresolved = r.status !== "Completed" && r.status !== "resolved" && r.status !== "Rejected";
      if (!isUnresolved) return;

      const dist = getDistanceInMeters(targetLat, targetLng, r.lat, r.lng);
      // Same category within 100 meters
      if (dist <= 100 && (!category || r.category.toLowerCase() === category.toLowerCase())) {
        if (dist < minDistance) {
          minDistance = dist;
          nearbyReport = { id: doc.id, ...r };
        }
      }
    });

    if (nearbyReport) {
      return res.json({
        isDuplicate: true,
        distanceMeters: Math.round(minDistance),
        nearbyReport
      });
    }

    res.json({ isDuplicate: false });
  } catch (error) {
    console.error("Check duplicate error:", error);
    res.status(500).json({ error: "Server error checking duplicate reports" });
  }
});

// 3. Submit a Waste Report (Citizen upload)
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { lat, lng, wasteSize, description, address, severity, finalCategory } = req.body;
    let imageUrl = req.body.imageUrl;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Coordinates (lat, lng) are required" });
    }

    let filename = "";
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      filename = req.file.originalname;
    } else if (!imageUrl) {
      return res.status(400).json({ error: "Image file or imageUrl is required" });
    } else {
      filename = imageUrl.split("/").pop();
    }

    // Run AI Classifier
    const classification = classifyWaste(filename);
    const category = finalCategory || classification.category;

    const now = new Date().toISOString();

    // Save report document with rich metadata
    const newReport = {
      userId: req.user.id,
      reporterName: req.user.name,
      imageUrl,
      category,
      aiPredictedCategory: classification.category,
      aiConfidence: classification.confidence,
      aiConfidenceLevel: classification.confidenceLevel,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      wasteSize: wasteSize || "Medium",
      severity: severity || "Medium",
      description: description || "",
      address: address || "Geo-tagged location",
      status: "Submitted", // Submitted -> Verified -> Assigned -> In Progress -> Resolved
      priority: severity === "Critical" ? "High" : severity === "High" ? "High" : severity === "Low" ? "Low" : "Medium",
      assignedWorkerId: "",
      assignedWorkerName: "",
      completionPhotoUrl: "",
      resolutionNote: "",
      supporters: [req.user.id],
      supportCount: 1,
      isVerified: false,
      statusHistory: [
        { status: "Submitted", timestamp: now, note: "Report created by citizen" }
      ],
      comments: [],
      createdAt: now
    };

    const reportRef = await db.collection("reports").add(newReport);

    // Initial Submission Reward: +5 points
    const awardedPoints = 5;
    const totalPoints = await awardUserPoints(req.user.id, awardedPoints, "Submitted new verified waste report");

    // Dispatch notifications
    await createNotification({
      userId: req.user.id,
      title: "Report Submitted (+5 Pts)",
      message: `Your ${category} report has been received and awarded +5 citizen points!`,
      reportId: reportRef.id,
      type: "success"
    });

    await createNotification({
      recipientRole: "admin",
      title: "New Waste Hazard Reported",
      message: `New ${severity} severity ${category} report at ${newReport.address}`,
      reportId: reportRef.id,
      type: "info"
    });

    res.status(201).json({
      id: reportRef.id,
      ...newReport,
      awardedPoints,
      totalPoints
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ error: "Server error submitting report" });
  }
});

// 4. Support an Existing Report (+3 points)
router.post("/:id/support", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reportRef = db.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = reportDoc.data();
    const supporters = report.supporters || [];

    if (supporters.includes(req.user.id)) {
      return res.status(400).json({ error: "You have already supported this report" });
    }

    supporters.push(req.user.id);
    const newSupportCount = supporters.length;

    await reportRef.update({
      supporters,
      supportCount: newSupportCount
    });

    const awardedPoints = 3;
    const totalPoints = await awardUserPoints(req.user.id, awardedPoints, `Supported nearby report #${id.substring(0, 6)}`);

    res.json({
      message: "Report supported successfully",
      supportCount: newSupportCount,
      awardedPoints,
      totalPoints
    });
  } catch (error) {
    console.error("Support report error:", error);
    res.status(500).json({ error: "Server error supporting report" });
  }
});

// 5. Verify Report (Admin action, awards +5 bonus points)
router.post("/:id/verify", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const reportRef = db.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = reportDoc.data();
    const now = new Date().toISOString();

    const history = report.statusHistory || [];
    history.push({
      status: "Verified",
      timestamp: now,
      note: `Verified by Admin (${req.user.name})`
    });

    await reportRef.update({
      isVerified: true,
      status: "Verified",
      statusHistory: history
    });

    // Award reporter +5 bonus verification points if not already verified
    if (!report.isVerified && report.userId) {
      await awardUserPoints(report.userId, 5, `Verification bonus for report #${id.substring(0, 6)}`);
      await createNotification({
        userId: report.userId,
        title: "Report Verified (+5 Pts)",
        message: `Your ${report.category || "waste"} report #${id.substring(0, 6)} was verified by municipal admins.`,
        reportId: id,
        type: "success"
      });
    }

    res.json({
      id,
      ...report,
      isVerified: true,
      status: "Verified",
      statusHistory: history
    });
  } catch (error) {
    console.error("Verify report error:", error);
    res.status(500).json({ error: "Server error verifying report" });
  }
});

// 6. Update Report/Task Status (Admin/Worker, Proof of Resolution Upload)
router.patch("/:id/status", authenticateToken, upload.single("completionPhoto"), async (req, res) => {
  try {
    const { id } = req.params;
    let { status, assignedWorkerId, assignedWorkerName, resolutionNote, priority } = req.body;

    // Normalize legacy status values
    if (status === "pending") status = "Submitted";
    if (status === "resolved") status = "Completed";

    const allowedStatuses = ["Submitted", "Under Review", "Verified", "Assigned", "In Progress", "Started", "Completed", "Rejected", "Duplicate"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` });
    }

    const reportRef = db.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const reportData = reportDoc.data();
    const updateData = {};
    const now = new Date().toISOString();

    if (priority) {
      updateData.priority = priority;
    }

    if (status) {
      updateData.status = status;

      const history = reportData.statusHistory || [];
      if (history.length === 0 || history[history.length - 1].status !== status) {
        history.push({
          status,
          timestamp: now,
          updatedBy: req.user.name,
          note: resolutionNote || `Status changed to ${status}`
        });
        updateData.statusHistory = history;
      }
    }

    if (assignedWorkerId !== undefined) {
      updateData.assignedWorkerId = assignedWorkerId;

      if (assignedWorkerId) {
        const workerRef = db.collection("users").doc(assignedWorkerId);
        const workerDoc = await workerRef.get();
        if (workerDoc.exists) {
          const wData = workerDoc.data();
          await workerRef.update({
            tasksAssigned: (wData.tasksAssigned || 0) + 1
          });
        }
      }
    }

    if (assignedWorkerName !== undefined) {
      updateData.assignedWorkerName = assignedWorkerName;
    }

    if (resolutionNote) {
      updateData.resolutionNote = resolutionNote;
    }

    // Handle Proof of Resolution photo upload
    if (req.file) {
      updateData.completionPhotoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.completionPhotoUrl) {
      updateData.completionPhotoUrl = req.body.completionPhotoUrl;
    }

    // Award final +10 resolution bonus points if becoming Completed/Resolved for the first time
    const isNowCompleted = status === "Completed" || status === "resolved";
    const wasAlreadyCompleted = reportData.status === "Completed" || reportData.status === "resolved";

    if (isNowCompleted && !wasAlreadyCompleted) {
      updateData.resolvedAt = now;
      updateData.resolvedBy = req.user.name;

      if (reportData.userId) {
        await awardUserPoints(reportData.userId, 10, `Waste resolution completed for report #${id.substring(0, 6)}`);
        await createNotification({
          userId: reportData.userId,
          title: "Waste Hazard Resolved (+10 Pts)",
          message: `Great news! The waste issue in report #${id.substring(0, 6)} has been resolved.`,
          reportId: id,
          type: "success"
        });
      }
    }

    await reportRef.update(updateData);

    const finalDoc = await reportRef.get();
    res.json({
      id,
      ...finalDoc.data()
    });
  } catch (error) {
    console.error("Update report status error:", error);
    res.status(500).json({ error: "Server error updating report status" });
  }
});

// 7. Assign Report to Worker
router.post("/:id/assign", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId, workerName } = req.body;

    if (!workerId || !workerName) {
      return res.status(400).json({ error: "workerId and workerName are required" });
    }

    const reportRef = db.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const reportData = reportDoc.data();
    const history = reportData.statusHistory || [];
    const status = "Assigned";

    history.push({
      status,
      timestamp: new Date().toISOString(),
      note: `Assigned to field worker ${workerName}`
    });

    await reportRef.update({
      status,
      assignedWorkerId: workerId,
      assignedWorkerName: workerName,
      statusHistory: history
    });

    const workerRef = db.collection("users").doc(workerId);
    const workerDoc = await workerRef.get();
    if (workerDoc.exists) {
      const wData = workerDoc.data();
      await workerRef.update({
        tasksAssigned: (wData.tasksAssigned || 0) + 1
      });
    }

    const finalDoc = await reportRef.get();
    res.json({
      id,
      ...finalDoc.data()
    });
  } catch (error) {
    console.error("Assign report error:", error);
    res.status(500).json({ error: "Server error assigning report" });
  }
});

// 8. Add Comment to Report
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const reportRef = db.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const reportData = reportDoc.data();
    const comments = reportData.comments || [];

    const newComment = {
      id: Math.random().toString(36).substring(2, 11),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    comments.push(newComment);
    await reportRef.update({ comments });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Server error adding comment" });
  }
});

module.exports = router;
