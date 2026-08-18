const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { authenticateToken } = require("../middleware/auth");

/**
 * Get notifications for current authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection("notifications").get();
    const list = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === req.user.id || data.recipientRole === req.user.role) {
        list.push({
          id: doc.id,
          ...data
        });
      }
    });

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list.slice(0, 30));
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

/**
 * Mark notification as read
 */
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notifRef = db.collection("notifications").doc(id);
    const doc = await notifRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await notifRef.update({ isRead: true });
    res.json({ success: true, id });
  } catch (error) {
    console.error("Mark read notification error:", error);
    res.status(500).json({ error: "Server error updating notification" });
  }
});

/**
 * Mark all notifications as read
 */
router.post("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection("notifications").get();
    const promises = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if ((data.userId === req.user.id || data.recipientRole === req.user.role) && !data.isRead) {
        promises.push(db.collection("notifications").doc(doc.id).update({ isRead: true }));
      }
    });

    await Promise.all(promises);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ error: "Server error marking notifications read" });
  }
});

module.exports = router;
