const bcrypt = require("bcryptjs");
const { db } = require("../config/firebase");

// Realistic unsplash images representing different waste types
const WASTE_IMAGES = {
  Plastic: [
    "https://images.unsplash.com/photo-1618477461853-cf6edfe6f8c6?auto=format&fit=crop&w=600&q=80", // bottles on beach
    "https://images.unsplash.com/photo-1526951914846-8a552872f53e?auto=format&fit=crop&w=600&q=80", // plastic cups
    "https://images.unsplash.com/photo-1595278069441-2cf29f8aa0f8?auto=format&fit=crop&w=600&q=80"  // crushed bottles
  ],
  Organic: [
    "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&w=600&q=80", // food waste
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80", // rotten fruits
    "https://images.unsplash.com/photo-1606166325683-e6deb697d30a?auto=format&fit=crop&w=600&q=80"  // organic pile
  ],
  "E-Waste": [
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80", // electronics pile
    "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=600&q=80", // broken boards
    "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80"  // old keyboard
  ],
  Metal: [
    "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80", // soda cans
    "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=600&q=80", // scrap metal
    "https://images.unsplash.com/photo-1516216628859-9bccecab13ca?auto=format&fit=crop&w=600&q=80"  // rusted pipes
  ],
  Mixed: [
    "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80", // general litter
    "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80", // garbage bags
    "https://images.unsplash.com/photo-1504439268584-b72c5019471e?auto=format&fit=crop&w=600&q=80"  // cardboard boxes
  ]
};

// Base coordinates for Bengaluru, India (can represent any mock city area)
const CENTER_LAT = 12.9716;
const CENTER_LNG = 77.5946;

// Random jitter generator for map coordinates
function getJitteredCoords(lat, lng, radiusKm = 3) {
  const y0 = lat;
  const x0 = lng;
  const rd = radiusKm / 111; // 111km per degree approx
  const u = Math.random();
  const v = Math.random();
  const w = rd * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return {
    lat: parseFloat((y0 + y).toFixed(5)),
    lng: parseFloat((x0 + x).toFixed(5))
  };
}

async function seedDatabase() {
  try {
    // 1. Check if database already has users (check citizens collection)
    const citizensSnapshot = await db.collection("citizens").get();
    if (!citizensSnapshot.empty) {
      console.log("📂 Database already seeded. Skipping seeder...");
      return;
    }

    console.log("🌱 Database is empty. Starting seeding process...");

    // 2. Create Users
    const adminPasswordHash = bcrypt.hashSync("admin123", 10);
    const citizen1PasswordHash = bcrypt.hashSync("citizen123", 10);
    const citizen2PasswordHash = bcrypt.hashSync("citizen123", 10); // same pwd for simple testing
    const workerPasswordHash = bcrypt.hashSync("worker123", 10);

    const users = {
      admin_user: {
        name: "Admin Officer",
        email: "admin@waste.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        phone: "+91 9900112233",
        createdAt: new Date().toISOString()
      },
      citizen_1: {
        name: "Aarav Sharma",
        email: "citizen1@waste.com",
        passwordHash: citizen1PasswordHash,
        role: "citizen",
        phone: "+91 9887766554",
        points: 120,
        redemptionHistory: [],
        createdAt: new Date().toISOString()
      },
      citizen_2: {
        name: "Priya Patel",
        email: "citizen2@waste.com",
        passwordHash: citizen2PasswordHash,
        role: "citizen",
        phone: "+91 9776655443",
        points: 60,
        redemptionHistory: [],
        createdAt: new Date().toISOString()
      },
      worker_1: {
        name: "Rajesh Kumar",
        email: "worker1@waste.com",
        passwordHash: workerPasswordHash,
        role: "worker",
        phone: "+91 9665544332",
        skills: ["Cleaning", "Waste Collection"],
        availability: true,
        rating: 4.8,
        tasksAssigned: 8,
        createdAt: new Date().toISOString()
      },
      worker_2: {
        name: "Sonia Rao",
        email: "worker2@waste.com",
        passwordHash: workerPasswordHash,
        role: "worker",
        phone: "+91 9554433221",
        skills: ["Recycling", "E-Waste"],
        availability: true,
        rating: 4.6,
        tasksAssigned: 4,
        createdAt: new Date().toISOString()
      }
    };

    // Save users in their role-specific collections
    for (const key of Object.keys(users)) {
      const userData = users[key];
      const col = userData.role === "admin" ? "admins" : userData.role === "worker" ? "workers" : "citizens";
      await db.collection(col).doc(key).set(userData);
    }
    console.log("👥 Successfully seeded users into role-based collections.");

    // 3. Create ~16 mock reports
    const reportCategories = ["Plastic", "Organic", "E-Waste", "Metal", "Mixed"];
    const reporters = [
      { id: "citizen_1", name: "Aarav Sharma" },
      { id: "citizen_2", name: "Priya Patel" }
    ];

    console.log("🗑️ Seeding 16 waste reports...");

    for (let i = 1; i <= 16; i++) {
      // Pick random category and reporter
      const category = reportCategories[i % reportCategories.length];
      const reporter = reporters[i % reporters.length];
      const imageUrls = WASTE_IMAGES[category];
      const imageUrl = imageUrls[i % imageUrls.length];

      // Jitter coordinates around the center point
      const { lat, lng } = getJitteredCoords(CENTER_LAT, CENTER_LNG, 4);

      // Determine statuses and assignments
      let status = "Submitted";
      let assignedWorkerId = "";
      let assignedWorkerName = "";
      let completionPhotoUrl = "";
      
      const dateOffsetDays = Math.floor(Math.random() * 8) + 1;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - dateOffsetDays);

      const statusHistory = [{
        status: "Submitted",
        timestamp: createdAt.toISOString(),
        note: "Report created by citizen"
      }];

      if (i <= 4) {
        status = "Completed";
        assignedWorkerId = "worker_1";
        assignedWorkerName = "Rajesh Kumar";
        completionPhotoUrl = imageUrl; // Reused for completed photo in seed
        
        const dateAssigned = new Date(createdAt.getTime() + 1000 * 60 * 60 * 2); // +2 hours
        const dateInProgress = new Date(createdAt.getTime() + 1000 * 60 * 60 * 3); // +3 hours
        const dateCompleted = new Date(createdAt.getTime() + 1000 * 60 * 60 * 5); // +5 hours
        
        statusHistory.push({ status: "Assigned", timestamp: dateAssigned.toISOString() });
        statusHistory.push({ status: "In Progress", timestamp: dateInProgress.toISOString() });
        statusHistory.push({ status: "Completed", timestamp: dateCompleted.toISOString() });
      } else if (i <= 8) {
        status = "In Progress";
        assignedWorkerId = "worker_1";
        assignedWorkerName = "Rajesh Kumar";

        const dateAssigned = new Date(createdAt.getTime() + 1000 * 60 * 60 * 2); // +2 hours
        const dateInProgress = new Date(createdAt.getTime() + 1000 * 60 * 60 * 3); // +3 hours

        statusHistory.push({ status: "Assigned", timestamp: dateAssigned.toISOString() });
        statusHistory.push({ status: "In Progress", timestamp: dateInProgress.toISOString() });
      } else if (i <= 12) {
        status = "Assigned";
        assignedWorkerId = "worker_2";
        assignedWorkerName = "Sonia Rao";

        const dateAssigned = new Date(createdAt.getTime() + 1000 * 60 * 60 * 4); // +4 hours
        statusHistory.push({ status: "Assigned", timestamp: dateAssigned.toISOString() });
      }

      // Predefined waste sizes and addresses for Bangalore seeding
      const wasteSizes = ["Small", "Medium", "Large"];
      const wasteSize = wasteSizes[i % wasteSizes.length];

      const addresses = [
        "MG Road Metro Station, Shantala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001",
        "Lalbagh Botanical Garden, Mavalli, Bengaluru, Karnataka 560004",
        "Commercial Street, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka 560001",
        "Indiranagar 100 Feet Rd, Hal 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
        "Cubbon Park, Kasturba Road, Sampangi Rama Nagar, Bengaluru, Karnataka 560001",
        "Koramangala 5th Block, Jyoti Nivas College Rd, Bengaluru, Karnataka 560095",
        "Malleshwaram 15th Cross, Margosa Rd, Bengaluru, Karnataka 560003",
        "Jayanagar 4th Block, 9th Main Rd, Jayanagar, Bengaluru, Karnataka 560011"
      ];
      const address = addresses[i % addresses.length];

      const report = {
        userId: reporter.id,
        reporterName: reporter.name,
        imageUrl,
        category,
        confidence: parseFloat((0.75 + Math.random() * 0.22).toFixed(2)),
        lat,
        lng,
        wasteSize,
        description: `Litter cleanup requested. Large amounts of ${category.toLowerCase()} waste observed in public path.`,
        address,
        status,
        assignedWorkerId,
        assignedWorkerName,
        completionPhotoUrl,
        statusHistory,
        comments: [
          {
            id: "comment_" + i,
            userId: reporter.id,
            userName: reporter.name,
            userRole: "citizen",
            text: `Please assign this quickly. It is causing a foul smell.`,
            timestamp: createdAt.toISOString()
          }
        ],
        createdAt: createdAt.toISOString()
      };

      await db.collection("reports").add(report);
    }

    console.log("✅ Seeding complete. 5 users and 16 reports added.");
  } catch (error) {
    if (error.code === 5 || (error.message && error.message.includes("NOT_FOUND"))) {
      console.error("\n❌ Database Connection Failed (Error 5: NOT_FOUND)");
      console.error("=================================================================");
      console.error("👉 REASON: The Firestore Database has not been initialized yet");
      console.error("   in your Firebase project Console.");
      console.error("👉 SOLUTION: ");
      console.error("   1. Open the Firebase Console: https://console.firebase.google.com");
      console.error("   2. Click on your project.");
      console.error("   3. Go to 'Firestore Database' in the left menu (under Build).");
      console.error("   4. Click the 'Create database' button.");
      console.error("   5. Select 'Start in Test Mode' and choose your database location.");
      console.error("   6. Ensure the database ID is set to '(default)'.");
      console.error("   7. Click Create. Once initialized, restart the backend server!");
      console.error("=================================================================\n");
    } else {
      console.error("❌ Seeding failed:", error);
    }
  }
}

module.exports = { seedDatabase };
