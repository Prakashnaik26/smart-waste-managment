const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, getUserCollection } = require("../config/firebase");
const { authenticateToken } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_123!";

// Signup Endpoint
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, phone, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Determine role and target collection
    const userRole = (role || "citizen").toLowerCase().trim();
    const collectionName = getUserCollection(userRole);

    // Check if user already exists across all role collections
    const roleCollections = ["citizens", "admins", "workers"];
    for (const col of roleCollections) {
      const snap = await db.collection(col).where("email", "==", email.toLowerCase().trim()).get();
      if (!snap.empty) {
        return res.status(400).json({ error: "User already exists with this email" });
      }
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const userId = Math.random().toString(36).substring(2, 15);

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: userRole,
      phone: phone || "",
      createdAt: new Date().toISOString()
    };

    // Populate role-specific fields
    if (userRole === "citizen") {
      newUser.points = 10; // Welcome points!
      newUser.redemptionHistory = [];
      newUser.pointsHistory = [{
        id: Math.random().toString(36).substring(2, 10),
        amount: 10,
        reason: "Welcome bonus for new citizen",
        timestamp: new Date().toISOString()
      }];
    } else if (userRole === "worker") {
      newUser.skills = Array.isArray(skills) ? skills : [];
      newUser.availability = true; // Default to Available
      newUser.rating = 5.0; // Default rating
      newUser.tasksAssigned = 0;
    }

    // Save to role-specific collection
    await db.collection(collectionName).doc(userId).set(newUser);

    // Sign JWT
    const token = jwt.sign(
      { id: userId, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const responseUser = {
      id: userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone
    };

    if (userRole === "citizen") {
      responseUser.points = newUser.points;
      responseUser.redemptionHistory = newUser.redemptionHistory;
      responseUser.pointsHistory = newUser.pointsHistory;
    } else if (userRole === "worker") {
      responseUser.skills = newUser.skills;
      responseUser.availability = newUser.availability;
      responseUser.rating = newUser.rating;
      responseUser.tasksAssigned = newUser.tasksAssigned;
    }

    res.status(201).json({
      token,
      user: responseUser
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login Endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Search all role collections to find the user
    const roleCollections = ["citizens", "admins", "workers"];
    let userId = "";
    let userData = null;

    for (const col of roleCollections) {
      const snapshot = await db.collection(col).where("email", "==", email.toLowerCase().trim()).get();
      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          userId = doc.id;
          userData = doc.data();
        });
        break;
      }
    }

    if (!userData) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(password, userData.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: userId, email: userData.email, role: userData.role, name: userData.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const responseUser = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone || ""
    };

    if (userData.role === "citizen") {
      responseUser.points = userData.points || 0;
      responseUser.redemptionHistory = userData.redemptionHistory || [];
      responseUser.pointsHistory = userData.pointsHistory || [];
    } else if (userData.role === "worker") {
      responseUser.skills = userData.skills || [];
      responseUser.availability = userData.availability !== undefined ? userData.availability : true;
      responseUser.rating = userData.rating !== undefined ? userData.rating : 5.0;
      responseUser.tasksAssigned = userData.tasksAssigned || 0;
    }

    res.json({
      token,
      user: responseUser
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Get Current User Profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const collectionName = getUserCollection(req.user.role);
    const userDoc = await db.collection(collectionName).doc(req.user.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const responseUser = {
      id: req.user.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone || ""
    };

    if (userData.role === "citizen") {
      responseUser.points = userData.points || 0;
      responseUser.redemptionHistory = userData.redemptionHistory || [];
      responseUser.pointsHistory = userData.pointsHistory || []; // Fixed: now returned
    } else if (userData.role === "worker") {
      responseUser.skills = userData.skills || [];
      responseUser.availability = userData.availability !== undefined ? userData.availability : true;
      responseUser.rating = userData.rating !== undefined ? userData.rating : 5.0;
      responseUser.tasksAssigned = userData.tasksAssigned || 0;
    }

    res.json(responseUser);
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ error: "Server error fetching user profile" });
  }
});

// Update Profile
router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, phone, skills, availability } = req.body;
    const collectionName = getUserCollection(req.user.role);
    const userDocRef = db.collection(collectionName).doc(req.user.id);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    if (userData.role === "worker") {
      if (skills !== undefined) updateData.skills = skills;
      if (availability !== undefined) updateData.availability = availability;
    }

    await userDocRef.update(updateData);

    const updatedDoc = await userDocRef.get();
    const updatedData = updatedDoc.data();

    const responseUser = {
      id: req.user.id,
      name: updatedData.name,
      email: updatedData.email,
      role: updatedData.role,
      phone: updatedData.phone || ""
    };

    if (updatedData.role === "citizen") {
      responseUser.points = updatedData.points || 0;
      responseUser.redemptionHistory = updatedData.redemptionHistory || [];
      responseUser.pointsHistory = updatedData.pointsHistory || [];
    } else if (updatedData.role === "worker") {
      responseUser.skills = updatedData.skills || [];
      responseUser.availability = updatedData.availability !== undefined ? updatedData.availability : true;
      responseUser.rating = updatedData.rating !== undefined ? updatedData.rating : 5.0;
      responseUser.tasksAssigned = updatedData.tasksAssigned || 0;
    }

    res.json(responseUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Server error updating user profile" });
  }
});

// Get All Users (Any authenticated user — used for leaderboard + admin views)
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const roleCollections = ["citizens", "admins", "workers"];
    const users = [];

    for (const col of roleCollections) {
      const snapshot = await db.collection(col).get();
      snapshot.forEach((doc) => {
        const { passwordHash, ...rest } = doc.data();
        users.push({ id: doc.id, ...rest });
      });
    }

    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ error: "Server error fetching users list" });
  }
});

module.exports = router;
