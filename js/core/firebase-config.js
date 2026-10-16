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
// Project pokesurvivor-free (since 2026-10-12): normal Firebase authentication,
// WITHOUT Identity Platform, so accounts are free with no limit. Never click
// "Upgrade to Identity Platform" in its console! (The old one was pokesurvivor-jpter.)
G.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB1LpJcsnT7gj7c8cpRMGjhswLPr8-dnBw',
  authDomain: 'pokesurvivor-free.firebaseapp.com',
  projectId: 'pokesurvivor-free',
  storageBucket: 'pokesurvivor-free.firebasestorage.app',
  messagingSenderId: '798271504277',
  appId: '1:798271504277:web:dcac4409f969239e87009c',
  databaseURL: 'https://pokesurvivor-free-default-rtdb.europe-west1.firebasedatabase.app'
};

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
