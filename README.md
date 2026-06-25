# FindIT

Project ID-6602

FindIT is our mobile-first prototype for an NUS lost-and-found app. The current work is moving
towards the Milestone 2 MVP: verified student access, Firebase-backed lost/found reports, claim
requests, status updates, and a first version of item matching.

## Current Features

- Register and log in from a dedicated first screen.
- Verify NUS email addresses through Firebase before entering the app.
- Toggle password visibility on the login and registration form.
- Show the reporting and feed screens only after login.
- Authenticate users with Firebase Authentication.
- Submit lost item reports with a title, location, description, and image.
- Submit found item reports with the same fields.
- Search, filter, and inspect reports from a detailed view.
- Submit claim/contact requests and resolve completed reports.
- View prototype match scores between opposite-type reports.
- Store user profiles and reports in Cloud Firestore.
- Store uploaded item photos in Cloud Storage for Firebase.
- Display separate lost and found feeds in a blue/orange mobile app-style UI.
- Run as a mobile-first web app prototype.

## Milestone 1 Scope

For this milestone, we focused on the core app flow:

- A student can register and log in.
- A logged-in student can enter the app and report a lost or found item.
- Item details are linked to the user who submitted them.
- Data persists after refreshing because it is stored in Firebase.

This is still a prototype. Firebase Authentication handles sign-in, and the app is currently
a mobile-first React web app rather than a native iOS or Android app. A later milestone can
move the interface to React Native/Expo or Flutter if we decide to build a native version.

## How To Run

Install dependencies once:

```bash
npm install
```

Create a local Firebase environment file:

```bash
touch .env
```

Fill in `.env` with the Firebase Web app config from the Firebase console.

Start the app:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

Auth, reports, and images all go through Firebase, so there is no separate backend to run.

## Firebase Hosting

Firebase Hosting serves the Vite production build from `dist`. All paths route back to
`index.html`, so refreshing inside the app still works. Deploys go to:

```text
https://nusfindit.web.app
```

Build and preview the hosted app locally:

```bash
npm run serve:hosting
```

Deploy when ready:

```bash
npm run deploy:hosting
```

Log in to Firebase once before deploying:

```bash
npm run firebase:login
```

The Firebase CLI is included as a development dependency, so it does not need to be installed
globally for this project.

## Mobile App Foundation

The `mobile/` folder is the Expo React Native starting point. It currently shows the shared
matching score flow with sample reports, while the existing web app remains the Firebase-backed
MVP.

Install mobile dependencies from the mobile folder:

```bash
cd mobile
npm install
```

Start the mobile app from the project root:

```bash
npm run mobile:start
```

The mobile app is planned to reuse the same Firebase project and shared matching helpers. See
`docs/MOBILE_MATCHING_PLAN.md` for the matching options and migration path.

If the mobile app opens to a blank screen, restart Expo with a clean cache:

```bash
cd mobile
npx expo start --clear
```

Then check the terminal and iOS simulator logs. The mobile app includes an error screen so render
errors should appear in the app instead of staying as a blank screen.

## GitHub Actions

Firebase Hosting is connected to GitHub Actions:

- Pull requests create a temporary Firebase Hosting preview URL for review.
- New commits pushed to the same pull request update the preview URL.
- Merges to `main` deploy the live site at `https://nusfindit.web.app`.

The workflows use repository secrets for the Firebase build values and the Firebase Hosting service
account. These are stored in GitHub under repository secrets, not committed to the codebase.

## Project Structure

```text
client/               React frontend
  src/App.jsx         Main app state and screen flow
  src/components/     Reusable UI sections
  src/constants/      Empty form values and defaults
  src/services/       Firebase Auth, Firestore, and Storage helpers
  src/utils/          Date, image, search, and matching helpers
  src/styles.css      Mobile-first app styling
  public/             App manifest and icon for PWA-style mobile preview
mobile/              Expo React Native app foundation
shared/              Cross-platform matching helpers
  matching.js         Item match scoring and filtering
  matching.test.js    Tests for the matching logic
functions/          Firebase Cloud Functions
  index.js           analyzeImage: gets Gemini labels for a photo
docs/                Learning notes and GitHub guide
firebase.json        Firebase Hosting, Firestore rules, and Storage rules setup
.firebaserc          Firebase project selection for deploys
```

## Notes

We started Milestone 1 with local JSON files so the full stack was easier to understand. Auth and
report storage now use Firebase, which is a better fit for a shared student app.

The interface is designed for phone-sized screens first because the intended product is a mobile
lost-and-found app. Login/register is separate from the in-app reporting flow, so the demo feels
more like an app even though it still runs in the browser.

## MVP Test Checklist

- Register with an NUS email address.
- Confirm that a verification email is sent after registration.
- Try logging in before verification and confirm access is blocked.
- Verify the email, then log in successfully.
- Toggle password visibility on register and login.
- Create one lost item report with an image.
- Create one found item report with a similar title, location, or photo color.
- Open the report detail view and check possible match scores.
- Submit a claim request from a different account.
- Mark a report as resolved and confirm new claim requests are closed.
- Confirm the Firebase Hosting preview is created from the pull request.

## Learning Path

Milestone 1 focuses on the basics:

- React state: remembering what the user typed.
- Forms: collecting lost/found report details.
- Firebase Auth: creating accounts and logging in.
- Firestore: saving item reports.
- Firebase Storage: saving uploaded images.
- Git/GitHub: version control, commits, and pushes.

Milestone 2 builds on that with search, claim requests, report status updates, and a first version
of photo/text matching. The current matching score is intentionally simple so we can understand it
clearly before replacing it with a stronger mobile image model later.
