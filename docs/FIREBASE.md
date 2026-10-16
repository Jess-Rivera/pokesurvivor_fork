# Setting up Firebase (database and accounts)

With this, saves are stored in the cloud and can be followed on any
computer. Everything is **free** (Firebase's Spark plan). It takes about 10 minutes.

Until you do it, the game works just as before, saving only in the
browser.

## 1. Create the project

1. Go to <https://console.firebase.google.com> with your Google account.
2. **Create a project** -> give it a name (e.g. `pokesurvivor`). The project
   identifier shows in the "Sign in with Google" window and cannot be changed afterward.
3. Google Analytics: **turn it off** (it is not needed and this way there is no tracking).

## 2. Enable accounts

1. Left menu -> **Build -> Authentication** -> **Get started**.
2. **Sign-in method** tab:
   - **Email/password** -> Enable -> Save.
     (The game uses name + password; internally it turns it into an
     internal email that nothing is ever sent to.)
   - **Google** -> Enable -> pick your support email -> Save.

## 3. Create the database

1. **Build -> Firestore Database** -> **Create database**.
2. Location: one in Europe (e.g. `eur3` or `europe-southwest1`). It cannot be changed afterward.
3. Start in **production mode**.
4. **Rules** tab: delete whatever is there, paste **all** the content of the
   [`firestore.rules`](../firestore.rules) file in this project and press **Publish**.

   These rules make each player able to read, write and delete only **their**
   save. Without them, anyone could touch other people's.

### 3b. Realtime Database (rooms and multiplayer)

1. **Build -> Realtime Database** -> **Create database** -> location
   **Belgium (europe-west1)** -> locked mode.
2. **Rules** tab: paste the content of [`database.rules.json`](../database.rules.json).
3. Copy the URL shown at the top (`https://...firebasedatabase.app`) and add it to
   `firebase-config.js` as `databaseURL: '...'`.

Faster, with Firebase's tool (it uploads both databases' rules
and the ranking indexes at once):

```
npx firebase-tools deploy --only firestore,database --project YOUR-PROJECT
```

## 4. Connect the game

1. Top left, the gear -> **Project settings**.
2. At the bottom, under **Your apps**, press the web icon **`</>`**.
3. Give it a nickname (e.g. `web`). Do **not** check Firebase Hosting. -> Register app.
4. It shows you a `const firebaseConfig = { ... }` block. Copy what is between the braces.
5. Open [`js/core/firebase-config.js`](../js/core/firebase-config.js) and replace
   `G.FIREBASE_CONFIG = null;` with:

   ```js
   G.FIREBASE_CONFIG = {
     apiKey: '...',
     authDomain: '...firebaseapp.com',
     projectId: '...',
     storageBucket: '...',
     messagingSenderId: '...',
     appId: '...'
   };
   ```

   This data is **not secret**: Firebase designs it to live inside the web page.
   What protects the saves are the rules from step 3.

## 5. Authorize the published site

**Authentication -> Settings -> Authorized domains -> Add domain**:

- `jpter78.github.io` (if you publish it on GitHub Pages)
- `localhost`, to test on your computer (new projects no longer have it preset).

Without this, "Sign in with Google" gives the *unauthorized domain* error.

## 6. Recommended: restrict the key

In <https://console.cloud.google.com/apis/credentials> (same project), open the
**Browser key** -> *Application restrictions* -> *Websites* and add:

- `https://jpter78.github.io/*`
- `http://localhost:*`

That way no one can use your key from another website.

## Testing on your computer

The cloud only works if the game is opened from a server (not by double-click):

```
python -m http.server 8000
```

and open <http://localhost:8000>. On the start screen the **Sign in with
Google** button and the text *"Your save is stored in the cloud"* should appear.
Top right, next to your name, a little **green** square indicates it is
saved in the cloud (yellow = saving, red = no connection).

## Free plan limits

Firestore: about 50,000 reads and 20,000 writes per day and 1 GB of data.
The game is designed to spend the minimum (measured in the emulator):

| Action | Reads | Writes |
|---|---|---|
| View a ranking tab | 1 (0 if you viewed it less than 10 min ago) | 0 |
| View your position if not in the top 50 | 1 the first time in that browser | 0 |
| Finish a game | ~3 | ~3-9 (only where you upgrade) |
| Save the game | 1 every 30 s at most | 1 every 30 s at most |
| Being connected | 0 | 1 every 10 min (the "online") |
| Open Friends or the room | 1 per friend (good for 1 min) | 0 |

How it is achieved:
- **Ranking**: each table has a summary document `lbs/{table}` with the
  top 50 (the rules check that each row matches a record validated
  against cheating in `lb/{table}/e/{id}`). What is read is cached 10 min in the
  browser. The filter by Pokemon only exists in the all-time table.
- **Save**: the browser copy is saved immediately; the cloud receives
  what is pending at most every 30 s and always on hiding or closing the tab.
  If you play on two computers at once, it merges on entering and on uploading.
- **Public profile**: after a game it is uploaded at most every 10 min.

Realtime Database: **100 connections at once** and 10 GB of download per month.
Only whoever is **in a room or group game** connects (the friends' "online"
and the invitations go through Firestore), so the limit of
100 only counts those playing in a group at that moment, not all the
players. Group games go directly between browsers and spend
nothing; only those that cannot connect directly go through here (about 20-70 MB
per hour and player). If one day it falls short, Firebase simply
rejects operations until the next day (it charges nothing unless you activate
a paid plan yourself).

## For developers: emulator

To test without touching the real project (needs Java 21):

```
npx firebase-tools emulators:start --project demo-ps --only auth,firestore,database
```

and in `firebase-config.js` use
`{ apiKey: 'demo', projectId: 'demo-ps', authDomain: 'demo-ps.firebaseapp.com', appId: 'demo', databaseURL: 'http://127.0.0.1:9000?ns=demo-ps-default-rtdb', emulator: true }`.
