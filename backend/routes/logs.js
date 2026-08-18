const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db } = require("../config/firebase");
const { authenticateToken } = require("../middleware/auth");

// Setup Multer storage for uploaded log images
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

// 1. Submit a Daily Log
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { hoursWorked, areaWorked, summary, challenges } = req.body;
    let photoUrl = "";

    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const newLog = {
      workerId: req.user.id,
      workerName: req.user.name,
      date: new Date().toISOString().split("T")[0],
      hoursWorked: parseFloat(hoursWorked) || 8,
      areaWorked: areaWorked || "",
      summary: summary || "",
      challenges: challenges || "",
      photoUrl,
      timestamp: new Date().toISOString()
    };

    const logRef = await db.collection("logs").add(newLog);

    res.status(201).json({
      id: logRef.id,
      ...newLog
    });
  } catch (error) {
    console.error("Create daily log error:", error);
    res.status(500).json({ error: "Server error submitting daily log" });
  }
});

// 2. Get Daily Logs
router.get("/", authenticateToken, async (req, res) => {
  try {
    const logsRef = db.collection("logs");
    let snapshot;

    if (req.user.role === "admin") {
      // Admin sees all logs
      snapshot = await logsRef.get();
    } else {
      // Workers see their own logs
      snapshot = await logsRef.where("workerId", "==", req.user.id).get();
    }

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(logs);
  } catch (error) {
    console.error("Fetch daily logs error:", error);
    res.status(500).json({ error: "Server error fetching daily logs" });
  }
});

module.exports = router;
