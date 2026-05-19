# FindIT

FindIT is a Milestone 1 prototype for an NUS-exclusive lost-and-found app.

Current features:

- Register and log in with unique credentials.
- Submit lost item reports with a title, location, description, and image.
- Submit found item reports with the same fields.
- Store users, reports, and uploaded images locally.
- Display separate lost and found feeds in an NUS blue/orange glassmorphism UI.

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
  src/styles.css     NUS colors and glassmorphism styling
server/              Node/Express backend
  index.js           API routes, password hashing, local storage
  data/users.json    Local user database
  data/items.json    Local item report database
  uploads/           Uploaded item photos
docs/                Learning notes and GitHub guide
```

## Learning Path

Milestone 1 focuses on full-stack basics:

- React state: remembering what the user typed.
- Forms: collecting lost/found report details.
- Fetch API: sending data from frontend to backend.
- Express routes: receiving requests and returning JSON.
- Local database files: saving data between app restarts.
- Git/GitHub: version control, commits, and pushes.
