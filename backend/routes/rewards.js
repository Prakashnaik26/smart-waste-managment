const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { authenticateToken } = require("../middleware/auth");

// Predefined catalog items with realistic images
const CATALOG = [
  {
    id: "sapling",
    name: "Plant Sapling",
    pointCost: 250,
    imageUrl: "https://images.unsplash.com/photo-1530251119572-0453c6e910e9?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "glass_container",
    name: "Glass Container (Recycled)",
    pointCost: 150,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "plate_set",
    name: "Reusable Plate Set",
    pointCost: 180,
    imageUrl: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "compost_bin",
    name: "Compost Bin",
    pointCost: 300,
    imageUrl: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "tote_bag",
    name: "Cloth Tote Bag",
    pointCost: 100,
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "notebook",
    name: "Recycled Notebook",
    pointCost: 80,
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "water_bottle",
    name: "Eco Water Bottle",
    pointCost: 200,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80"
  }
];

// 1. Get Product Catalog
router.get("/catalog", (req, res) => {
  res.json(CATALOG);
});

// 2. Redeem a Product
router.post("/redeem", authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;

    const product = CATALOG.find(p => p.id === productId);
    if (!product) {
      return res.status(400).json({ error: "Invalid product selected" });
    }

    const userDocRef = db.collection("citizens").doc(req.user.id);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < product.pointCost) {
      return res.status(400).json({
        error: `Insufficient points. You have ${currentPoints} pts, but ${product.name} costs ${product.pointCost} pts.`
      });
    }

    const updatedPoints = currentPoints - product.pointCost;
    const now = new Date().toISOString();

    const redemptionRecord = {
      id: Math.random().toString(36).substring(2, 15),
      productId: product.id,
      productName: product.name,
      pointCost: product.pointCost,
      timestamp: now
    };

    // Update user redemption history and points balance
    const history = userData.redemptionHistory || [];
    history.push(redemptionRecord);

    await userDocRef.update({
      points: updatedPoints,
      redemptionHistory: history
    });

    // Also write a record to the redemptions collection
    await db.collection("redemptions").add({
      userId: req.user.id,
      userName: req.user.name,
      ...redemptionRecord
    });

    res.json({
      message: `Successfully redeemed ${product.name}!`,
      points: updatedPoints,
      redemption: redemptionRecord
    });
  } catch (error) {
    console.error("Redeem error:", error);
    res.status(500).json({ error: "Server error executing point redemption" });
  }
});

// 3. Get User's Redemption History
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection("citizens").doc(req.user.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    res.json(userData.redemptionHistory || []);
  } catch (error) {
    console.error("Fetch redemption history error:", error);
    res.status(500).json({ error: "Server error fetching redemption logs" });
  }
});

module.exports = router;
