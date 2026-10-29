// bootstrap-admin.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize using the modern sub-modules
initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();

async function makeFirstAdmin(uid) {
  try {
    // Set custom claims using the modern auth module
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Success! User ${uid} is now your first Admin.`);
  } catch (error) {
    console.error("Error setting claim:", error);
  }
}

// Your actual Firebase User UID
makeFirstAdmin("q3xxxxxxxxxxxxxxxxxx2");

