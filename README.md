# FindIT

Project ID-6602

FindIT is a mobile-first NUS lost-and-found web app prototype. The current branch contains the
Milestone 2 MVP: verified student access, Firebase-backed lost/found reports, claim requests,
report status updates, screen-based navigation, and AI-assisted item matching using Firebase Cloud
Functions with Gemini image analysis.

## Current Features

### Verified Student Access

- Students register and log in from a dedicated authentication screen.
- Registration is restricted to NUS email domains.
- Firebase Authentication sends a verification email after registration.
- Users cannot enter the app until Firebase reports that their email is verified.
- The login/register form includes password visibility controls and clear validation messages.

How it works:

- `client/src/services/firebaseClient.js` wraps Firebase Auth calls.
- New users are created with Firebase Authentication, then a matching profile document is stored in
  Cloud Firestore.
- Unverified users are signed out immediately and asked to verify their email before continuing.

### Firebase-Backed Lost And Found Reports

- Signed-in users can create lost or found reports.
- Each report includes type, title, location, description, photo, search keywords, match attributes,
  image signature, image labels, owner details, status, and timestamps.
- Item photos are uploaded to Cloud Storage for Firebase.
- Report metadata is stored in Cloud Firestore.
- Reports persist after refresh and are loaded in newest-first order.

How it works:

- The app uploads the selected image to Firebase Storage.
- It creates an `items` document in Firestore with the report details and the uploaded image URL.
- The app stores normalized search keywords and match attributes alongside each report so matching
  does not depend only on the visible text.

### Gemini Image Analysis Through Cloud Functions

- Uploaded item photos can be analyzed by a Firebase Cloud Function named `analyzeImage`.
- The function uses Gemini to produce labels such as category, color, material, brand, and visible
  identifiers.
- A Google Vision fallback can provide labels/text detection if Gemini analysis is unavailable.
- The function rate-limits image analysis per signed-in user.
- Analysis results are saved back onto the report as `imageLabels`, `imageAnalysis`,
  `imageAnalysisStatus`, and `imageAnalysisUpdatedAt`.
- If another report already has labels for the same image signature, the app can reuse the cached
  labels instead of immediately calling the function again.

How it works:

- `client/src/utils/imageFiles.js` creates a compact image signature from the uploaded photo.
- `client/src/services/firebaseClient.js` sends the base64 image, signature, description, and user id
  to the callable Cloud Function.
- `functions/index.js` validates the signed-in user, enforces rate limits, checks the in-memory cache,
  calls Gemini, optionally falls back to Vision, normalizes labels, and returns structured analysis.

### Smart Item Matching

- Lost reports are matched against open found reports, and found reports are matched against open lost
  reports.
- Matching uses report text, search keywords, location, extracted attributes, Gemini image labels,
  image color signatures, and report time proximity.
- The app shows confidence labels such as low, medium, and high.
- The feed can surface the strongest match for the signed-in user's open reports.
- Detail pages show possible matches and highlight high-confidence found reports for lost items.
- Matching is covered by Node tests in `shared/matching.test.js`.

How it works:

- `shared/matching.js` normalizes synonyms such as `billfold` to `wallet`, `airpods` to `earbuds`,
  and `power bank` to `powerbank`.
- It extracts categories, colors, materials, brands, and identifiers from report text.
- It compares Gemini labels with weighted confidence, compares image signatures, and caps scores when
  visual evidence clearly disagrees.
- `client/src/utils/matching.js` re-exports the shared matching helpers for the React app.

### Screen-Based Mobile-First UI

- The app uses an app-like screen flow instead of a long single page.
- Bottom tabs switch between feed, report, and account areas.
- The feed supports search, status/type filters, category chips, and newest/oldest sorting.
- Report creation opens through a report sheet where users choose lost or found.
- Detail screens show report metadata, owner actions, claims, and possible matches.
- A match reveal screen focuses the user on a strong possible match.

How it works:

- `client/src/App.jsx` owns the current screen state and coordinates data loading, report creation,
  claims, matching, and navigation.
- Reusable UI pieces live in `client/src/components/`.
- `client/src/styles.css` provides the mobile-first visual layout used by the web prototype.

### Claims And Resolution Flow

- Users register with a Telegram contact so claim requests can include contact details automatically.
- Report owners can view claimant Telegram contacts, and lost-item owners can see found-item owner contact details on high-confidence matches.
- Owners can mark reports as resolved.
- Resolved reports stay visible but no longer accept new claim requests.

How it works:

- Claims are stored as subcollections under each item document in Firestore.
- Resolution updates the report status, resolver id, and resolved timestamp.
- The UI changes available actions based on ownership and report status.

### Firebase Hosting And Preview Deploys

- Firebase Hosting serves the Vite production build from `dist`.
- All routes rewrite to `index.html`, so refreshing inside the app works.
- GitHub Actions create preview deployments for pull requests.
- Merges to `main` deploy the live hosted app.

Live hosting target:

```text
https://nusfindit.web.app
```

## Milestone 1 Scope

Milestone 1 focused on the core Firebase app flow:

- A student can register and log in.
- A logged-in student can enter the app and report a lost or found item.
- Item details are linked to the user who submitted them.
- Report data and uploaded images persist through Firebase.

The app was still a mobile-first React web prototype rather than a native mobile app. Firebase
Authentication, Firestore, and Storage replaced the earlier local JSON prototype data flow.

## Milestone 2 Scope

Milestone 2 expands the prototype from basic reporting into a usable lost-and-found workflow:

- Verified access: only verified NUS email users can enter the main app.
- Report management: users can submit lost/found reports with images and inspect detailed report
  pages.
- Search and filtering: users can search by text, filter by report type/status/category, and sort the
  feed.
- Claim workflow: users can send claim requests with their registered Telegram contact, owners can
  reject or progress requests, and owners can resolve completed reports.
- AI-assisted matching: the app extracts report attributes, computes local image signatures, requests
  Gemini image labels through Cloud Functions, and combines those signals into match scores.
- Match review: the UI surfaces possible matches in the feed, detail pages, and a focused match review
  screen.
- Firebase deployment: the app is buildable for Firebase Hosting, with Firestore/Storage rules and
  Cloud Functions in the repo.
- Test coverage: the shared matching engine has automated tests for synonyms, category mismatches,
  image-label confidence, image-signature behavior, and top-match selection.

Milestone 2 is still an MVP. It proves the end-to-end workflow and matching concept, but future
milestones can improve notification delivery, moderation, analytics, native mobile packaging, and
production-grade AI cost controls.

## How To Run Locally

Install dependencies once:

```bash
npm install
```

Create a local Firebase environment file:

```bash
touch .env
```

Fill in `.env` with the Firebase Web app config from the Firebase console:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Start the app:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

The frontend talks directly to Firebase Auth, Firestore, Storage, and callable Cloud Functions.

## Cloud Function Secrets

The image analysis function reads secrets from Firebase Functions:

```text
GEMINI_API_KEY
VISION_API_KEY
```

`GEMINI_API_KEY` powers Gemini image analysis. `VISION_API_KEY` is used only as a fallback when Gemini
does not return usable labels.

Before deploying functions, set the secrets in Firebase:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set VISION_API_KEY
```

These values should not be committed to the repository.

## Firebase Hosting

Build the production app:

```bash
npm run build
```

Build and preview the hosted app locally with Firebase emulators:

```bash
npm run serve:hosting
```

Deploy hosting when ready:

```bash
npm run deploy:hosting
```

Log in to Firebase once before deploying:

```bash
npm run firebase:login
```

The Firebase CLI is included as a development dependency, so it does not need to be installed
globally for this project.

## GitHub Actions

Firebase Hosting is connected to GitHub Actions:

- Pull requests create a temporary Firebase Hosting preview URL for review.
- New commits pushed to the same pull request update the preview URL.
- Merges to `main` deploy the live site at `https://nusfindit.web.app`.

The workflows use repository secrets for the Firebase build values and the Firebase Hosting service
account. These are stored in GitHub under repository secrets, not committed to the codebase.

## Project Structure

```text
client/                  React frontend
  src/App.jsx            Main app state, screen flow, reporting, claims, and matching orchestration
  src/components/        Reusable UI sections and screen components
  src/constants/         Empty form values and feed defaults
  src/services/          Firebase Auth, Firestore, Storage, and Functions helpers
  src/utils/             Date, image signature, and matching helpers
  src/styles.css         Mobile-first app styling
  public/                App manifest, logo, and icon for PWA-style mobile preview
shared/                  Cross-platform matching helpers
  matching.js            Item match scoring, filtering, reasons, and confidence helpers
  matching.test.js       Tests for the matching engine
functions/               Firebase Cloud Functions
  index.js               analyzeImage callable function using Gemini with Vision fallback
docs/                    Learning notes and GitHub guide
firebase.json            Firebase Hosting, Functions, Firestore rules, and Storage rules setup
.firebaserc              Firebase project selection for deploys
```

## Quality Checks

Run the shared matching tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

Check Cloud Function syntax:

```bash
node --check functions/index.js
```

## MVP Test Checklist

- Register with an NUS email address.
- Confirm that a verification email is sent after registration.
- Try logging in before verification and confirm access is blocked.
- Verify the email, then log in successfully.
- Toggle password visibility on register and login.
- Create one lost item report with an image.
- Create one found item report with a similar category, location, or photo.
- Confirm the report image uploads and appears in the feed/detail screen.
- Confirm image analysis eventually stores labels or a failed status on the report.
- Search and filter the feed by text, type, status, category, and sort order.
- Open the report detail view and check possible match scores and match reasons.
- Review a surfaced match from the feed or match screen.
- Submit a claim request from a different account.
- Mark a report as resolved and confirm new claim requests are closed.
- Run `npm test` and confirm the matching tests pass.
- Confirm the Firebase Hosting preview is created from the pull request.

## Learning Path

Milestone 1 focused on:

- React state and forms.
- Firebase Authentication.
- Firestore document storage.
- Firebase Storage image uploads.
- Git/GitHub collaboration.

Milestone 2 builds on that with:

- Screen-based UI state.
- Firestore subcollections for claims.
- Report status transitions.
- Shared matching logic and automated tests.
- Client-side image signatures.
- Callable Firebase Cloud Functions.
- Gemini/Vision image labeling.
- Firebase Hosting previews and deployment.
