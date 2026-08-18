require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { seedDatabase } = require("./utils/seeder");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend API requests
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists and serve it statically
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Connect API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/rewards", require("./routes/rewards"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/notifications", require("./routes/notifications"));

// Base Check Route
app.get("/", (req, res) => {
  res.json({ message: "Smart Waste Management API is online!" });
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Seed database with dummy records on startup if appropriate
  console.log("🌱 Checking database seeding status...");
  await seedDatabase();
  console.log("🏁 Backend setup is complete and ready!");
});
