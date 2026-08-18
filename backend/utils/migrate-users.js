/**
 * One-time migration: moves all documents from the old "users" collection
 * into role-specific collections: citizens / admins / workers
 * 
 * Run with: node migrate-users.js
 */

const { db, getUserCollection } = require("../config/firebase");

async function migrateUsers() {
  try {
    console.log("🚀 Starting user migration: users → citizens / admins / workers");

    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("ℹ️  No documents in 'users' collection — nothing to migrate.");
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const role = userData.role;

      if (!role) {
        console.warn(`⚠️  Skipped '${userId}' — no role field found.`);
        skipped++;
        continue;
      }

      const targetCollection = getUserCollection(role);

      // Check if already exists in the target collection
      const existing = await db.collection(targetCollection).doc(userId).get();
      if (existing.exists) {
        console.log(`⏭️  '${userId}' (${role}) already in '${targetCollection}' — skipped.`);
        skipped++;
        continue;
      }

      // Copy to role-specific collection
      await db.collection(targetCollection).doc(userId).set(userData);
      console.log(`✅ Migrated '${userId}' (${userData.name || "?"}) → '${targetCollection}'`);
      migrated++;
    }

    console.log(`\n🎉 Migration complete! ${migrated} migrated, ${skipped} skipped.`);
    console.log("⚠️  The old 'users' collection was NOT deleted. You can remove it manually from the Firebase console if desired.");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    process.exit(0);
  }
}

migrateUsers();
