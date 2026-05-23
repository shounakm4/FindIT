# FindIT

Project ID-6602

FindIT is our Milestone 1 mobile-first prototype for an NUS-exclusive lost-and-found app.
The goal for this checkpoint is to show a minimal but working frontend-backend flow: users
can create an account, log in, and submit lost/found item reports that are saved locally.

## Current Features

- Register and log in through a dedicated first screen, similar to a typical mobile app.
- Unlock the reporting and feed screens only after the user is authenticated.
- Submit lost item reports with a title, location, description, and image.
- Submit found item reports with the same fields.
- Store users, reports, and uploaded images locally.
- Display separate lost and found feeds in an NUS blue/orange mobile app-style UI.
- Run as a mobile-first progressive web app prototype with app manifest metadata.

## Milestone 1 Scope

For this milestone, we focused on proving that the main app flow works end to end:

- A student can register and log in.
- A logged-in student can enter the app and report a lost or found item.
- Item details are connected to the user who submitted them.
- The frontend talks to the backend through API calls.
- Data persists after refreshing because it is stored in local JSON files.

This is still a prototype. Authentication is intentionally simple, and the app is currently
a mobile-first React/PWA build rather than a native iOS or Android app. A later milestone can
migrate the interface to React Native/Expo or Flutter if we decide to build a fully native app.

## How To Run

Install dependencies once:

```bash
npm install
```

Start the backend and frontend together:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

The backend runs at `http://localhost:3001`.

## Project Structure

```text
client/              React frontend
  src/App.jsx        Main app logic and UI
  src/styles.css     Mobile-first app styling
  public/            App manifest and icon for PWA-style mobile preview
server/              Node/Express backend
  index.js           API routes, password hashing, local storage
  data/users.json    Local user database
  data/items.json    Local item report database
  uploads/           Uploaded item photos
docs/                Learning notes and GitHub guide
```

## Notes From This Build

We used local JSON files for Milestone 1 so that we could learn and demonstrate the full stack
without spending the first checkpoint on database hosting and deployment issues. Passwords are
hashed before they are written to `server/data/users.json`, and uploaded item photos are saved
under `server/uploads/`.

The interface is designed for phone-sized screens first because the intended product is a mobile
lost-and-found app. The current React implementation now separates the login/register experience
from the in-app reporting flow, which makes the demo closer to a typical mobile app even though it
is still running as a local web/PWA prototype.

## Learning Path

Milestone 1 focuses on full-stack basics:

- React state: remembering what the user typed.
- Forms: collecting lost/found report details.
- Fetch API: sending data from frontend to backend.
- Express routes: receiving requests and returning JSON.
- Local database files: saving data between app restarts.
- Git/GitHub: version control, commits, and pushes.
