const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let db;
let isMock = false;

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("🔥 Successfully connected to Firebase Firestore!");
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error.message);
    console.log("⚡ Falling back to Local Mock Database mode...");
    setupMockDb();
  }
} else {
  console.log("⚠️  serviceAccountKey.json NOT found at:", serviceAccountPath);
  console.log("⚡ Running in Local Mock Database mode (writes to backend/data/db.json).");
  console.log("💡 To connect to Firebase: Generate a Service Account Private Key JSON from the Firebase Console, rename it to 'serviceAccountKey.json', and place it in the backend/ directory.");
  setupMockDb();
}

function setupMockDb() {
  isMock = true;
  const mockDbPath = path.join(__dirname, "..", "data", "db.json");
  const dataDir = path.dirname(mockDbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure db.json exists
  if (!fs.existsSync(mockDbPath)) {
    fs.writeFileSync(mockDbPath, JSON.stringify({ citizens: {}, admins: {}, workers: {}, reports: {}, notifications: {}, logs: {}, redemptions: {} }, null, 2));
  }

  // Load and save helper
  const readData = () => {
    try {
      return JSON.parse(fs.readFileSync(mockDbPath, "utf8"));
    } catch (e) {
      return { citizens: {}, admins: {}, workers: {}, reports: {} };
    }
  };

  const writeData = (data) => {
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
  };

  // Firestore-like Mock API
  db = {
    collection: (colName) => {
      return {
        // Get document by ID
        doc: (docId) => {
          return {
            get: async () => {
              const data = readData();
              const docData = data[colName]?.[docId];
              return {
                exists: !!docData,
                id: docId,
                data: () => docData
              };
            },
            set: async (val, options = {}) => {
              const data = readData();
              if (!data[colName]) data[colName] = {};
              
              if (options.merge && data[colName][docId]) {
                data[colName][docId] = { ...data[colName][docId], ...val };
              } else {
                data[colName][docId] = val;
              }
              writeData(data);
              return { id: docId };
            },
            update: async (val) => {
              const data = readData();
              if (data[colName]?.[docId]) {
                data[colName][docId] = { ...data[colName][docId], ...val };
                writeData(data);
              } else {
                throw new Error(`Document ${docId} not found in collection ${colName}`);
              }
              return { id: docId };
            },
            delete: async () => {
              const data = readData();
              if (data[colName]?.[docId]) {
                delete data[colName][docId];
                writeData(data);
              }
              return { id: docId };
            }
          };
        },
        // Add new document with auto ID
        add: async (val) => {
          const data = readData();
          if (!data[colName]) data[colName] = {};
          const docId = Math.random().toString(36).substring(2, 15);
          data[colName][docId] = { ...val, id: docId };
          writeData(data);
          return { id: docId };
        },
        // Get all docs, or filter
        get: async () => {
          const data = readData();
          const colData = data[colName] || {};
          const docs = Object.keys(colData).map(id => ({
            id,
            data: () => colData[id]
          }));
          return {
            docs,
            empty: docs.length === 0,
            forEach: (cb) => docs.forEach(cb)
          };
        },
        // Query filter mock (only handles simple == email filter for login)
        where: (field, op, val) => {
          return {
            get: async () => {
              const data = readData();
              const colData = data[colName] || {};
              const matchedDocs = Object.keys(colData)
                .map(id => ({ id, ...colData[id] }))
                .filter(doc => doc[field] === val)
                .map(doc => {
                  const { id, ...rest } = doc;
                  return {
                    id,
                    data: () => rest
                  };
                });
              return {
                docs: matchedDocs,
                empty: matchedDocs.length === 0,
                forEach: (cb) => matchedDocs.forEach(cb)
              };
            }
          };
        }
      };
    }
  };
}

/**
 * Maps a user role string to its Firestore collection name.
 * Use this everywhere instead of hard-coding "users".
 */
function getUserCollection(role) {
  if (role === "citizen") return "citizens";
  if (role === "admin") return "admins";
  if (role === "worker") return "workers";
  return "citizens"; // safe default
}

module.exports = { db, isMock, getUserCollection };
