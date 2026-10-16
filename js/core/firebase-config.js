/* ============ firebase-config.js — connection to your Firebase project ============
 * Paste your Firebase web app config here (Firebase Console >
 * Project settings > Your apps > SDK setup and configuration > Config).
 * The full steps are in docs/FIREBASE.md.
 *
 * This data is NOT secret: Firebase designs it to live in the web page. What
 * protects the saves are the Firestore rules (firestore.rules).
 *
 * If set to null, the game runs in local mode (browser only).
 */
// Local-only fork: no Firebase project connected, so the game saves to the
// browser's localStorage (no accounts, cloud save, friends, leaderboard or co-op).
// To enable the cloud on your own copy, create a free Firebase project and paste
// its config here, replacing null. Full steps in docs/FIREBASE.md.
G.FIREBASE_CONFIG = null;

/* Example of how it should look:
G.FIREBASE_CONFIG = {
  apiKey: 'AIza...',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123'
};
*/
