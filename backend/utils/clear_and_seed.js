const { db, isMock } = require("../config/firebase");
const { seedDatabase } = require("./seeder");

async function clearCollection(colName) {
  try {
    const snapshot = await db.collection(colName).get();
    const promises = [];
    snapshot.forEach(doc => {
      promises.push(db.collection(colName).doc(doc.id).delete());
    });
    await Promise.all(promises);
    console.log(`Cleared collection: ${colName}`);
  } catch (err) {
    console.warn(`Could not clear ${colName}:`, err.message);
  }
}

async function main() {
  if (isMock) {
    const fs = require("fs");
    const path = require("path");
    const mockDbPath = path.join(__dirname, "..", "data", "db.json");
    if (fs.existsSync(mockDbPath)) {
      fs.unlinkSync(mockDbPath);
      console.log("Mock database file deleted.");
    }
  } else {
    console.log("Firestore detected. Cleaning collections...");
    await clearCollection("users");
    await clearCollection("reports");
    await clearCollection("logs");
    await clearCollection("redemptions");
  }
  
  console.log("Running seeder...");
  await seedDatabase();
  console.log("Re-seeding complete!");
}

main().catch(console.error);
