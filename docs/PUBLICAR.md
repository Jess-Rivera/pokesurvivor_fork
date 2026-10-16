# Publishing the game free on GitHub Pages

The game is a static website: GitHub Pages serves it free at
`https://jpter78.github.io/pokesurvivor/`.

## 1. Create the repository (once)

1. Go to <https://github.com/new> with the **JPTER78** account.
2. Name: `pokesurvivor` . **Public** . **without** a README, .gitignore or license
   (they already come with the project).
3. Create repository.

## 2. Upload the project

From the project folder (the local repository is already created and with the
first commit done):

```
git remote add origin https://github.com/JPTER78/pokesurvivor.git
git push -u origin main
```

The first time a window opens to sign in to GitHub.
It is about 75 MB, it may take a few minutes.

## 3. Enable GitHub Pages

In the repository: **Settings -> Pages** ->
*Source*: **Deploy from a branch** -> *Branch*: **main**, folder **/ (root)** -> **Save**.

In a minute or two it will be at <https://jpter78.github.io/pokesurvivor/>.

## 4. Connect with Firebase

If you already followed [FIREBASE.md](FIREBASE.md), add `jpter78.github.io` to the
**authorized domains** of Authentication (step 5) and upload the
filled-in `firebase-config.js`:

```
git add js/core/firebase-config.js
git commit -m "Connect with Firebase"
git push
```

## 5. Getting it to show on Google

1. <https://search.google.com/search-console> -> **Add property** ->
   *URL prefix* -> `https://jpter78.github.io/pokesurvivor/`.
2. Verification: the **HTML tag** method gives you a `<meta ...>` line;
   paste it inside `<head>` in `index.html`, do `git push`, and press Verify.
3. **URL Inspection** -> paste the address -> **Request indexing**.

Google takes from days to weeks to show it, and at first it only appears if you
search the exact name.

## Updating the game later

Every time you change something:

```
git add -A
git commit -m "What you changed"
git push
```

GitHub Pages updates on its own in a minute or two.

## Reminders

- **No money**: no ads, no donations in exchange for anything, no payments.
  The sprite license (CC BY-NC) requires it and it is what most reduces the
  risk that Nintendo asks for it to be taken down.
- If a copyright claim arrives at the legal-notice email, handle it
  quickly: taking down what they ask usually closes the matter.
