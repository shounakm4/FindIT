import { useEffect, useMemo, useState } from "react";

const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

const emptyItemForm = {
  type: "lost",
  title: "",
  location: "",
  description: "",
  imageDataUrl: ""
};

function App() {
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("finditUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const lostItems = useMemo(() => items.filter((item) => item.type === "lost"), [items]);
  const foundItems = useMemo(() => items.filter((item) => item.type === "found"), [items]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const response = await fetch("/api/items");
    const data = await response.json();
    setItems(data.items || []);
  }

  function updateAuthForm(event) {
    setAuthForm({
      ...authForm,
      [event.target.name]: event.target.value
    });
  }

  function updateItemForm(event) {
    setItemForm({
      ...itemForm,
      [event.target.name]: event.target.value
    });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage("");

    const payload =
      authMode === "register"
        ? authForm
        : {
            email: authForm.email,
            password: authForm.password
          };

    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Unable to continue.");
      return;
    }

    setCurrentUser(data.user);
    localStorage.setItem("finditUser", JSON.stringify(data.user));
    setAuthForm(emptyAuthForm);
    setMessage(`Welcome, ${data.user.name}.`);
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setItemForm({ ...itemForm, imageDataUrl: "" });
      return;
    }

    const imageDataUrl = await readFileAsDataUrl(file);
    setItemForm({ ...itemForm, imageDataUrl });
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!currentUser) {
      setMessage("Please register or log in before posting an item.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...itemForm,
        userId: currentUser.id
      })
    });
    const data = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Unable to save item.");
      return;
    }

    setItems([data.item, ...items]);
    setItemForm(emptyItemForm);
    setMessage(`${data.item.type === "lost" ? "Lost" : "Found"} item report saved.`);
  }

  function handleSignOut() {
    setCurrentUser(null);
    localStorage.removeItem("finditUser");
    setMessage("Signed out.");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <h1>Find<span>IT</span></h1>
          <p>
            A secure lost-and-found prototype for NUS students to report lost and found items with
            photos, descriptions, and campus locations.
          </p>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="glass-panel auth-panel">
          <div className="panel-heading">
            <p className="panel-label">Step 1</p>
            <h2>{currentUser ? "Your Account" : "Student Login"}</h2>
          </div>

          {currentUser ? (
            <div className="signed-in-card">
              <div className="avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{currentUser.name}</strong>
                <p>{currentUser.email}</p>
              </div>
              <button className="secondary-button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="segmented-control" aria-label="Choose authentication mode">
                <button
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  Register
                </button>
                <button
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  Login
                </button>
              </div>

              <form className="stacked-form" onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <label>
                    Name
                    <input
                      name="name"
                      value={authForm.name}
                      onChange={updateAuthForm}
                      placeholder="Shounak"
                      required
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    value={authForm.email}
                    onChange={updateAuthForm}
                    placeholder="e0123456@u.nus.edu"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    value={authForm.password}
                    onChange={updateAuthForm}
                    placeholder="Choose a password"
                    required
                  />
                </label>
                <button className="primary-button" type="submit">
                  {authMode === "register" ? "Create account" : "Log in"}
                </button>
              </form>
            </>
          )}

          {message && <p className="message">{message}</p>}
        </aside>

        <section className="glass-panel report-panel">
          <div className="panel-heading">
            <p className="panel-label">Step 2</p>
            <h2>Report an Item</h2>
          </div>

          <form className="report-form" onSubmit={handleItemSubmit}>
            <div className="type-toggle">
              <label className={itemForm.type === "lost" ? "selected" : ""}>
                <input
                  type="radio"
                  name="type"
                  value="lost"
                  checked={itemForm.type === "lost"}
                  onChange={updateItemForm}
                />
                Lost item
              </label>
              <label className={itemForm.type === "found" ? "selected" : ""}>
                <input
                  type="radio"
                  name="type"
                  value="found"
                  checked={itemForm.type === "found"}
                  onChange={updateItemForm}
                />
                Found item
              </label>
            </div>

            <div className="form-row">
              <label>
                Item name
                <input
                  name="title"
                  value={itemForm.title}
                  onChange={updateItemForm}
                  placeholder="AirPods Pro"
                  required
                />
              </label>
              <label>
                Location
                <input
                  name="location"
                  value={itemForm.location}
                  onChange={updateItemForm}
                  placeholder="COM3, Level 2"
                  required
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                name="description"
                value={itemForm.description}
                onChange={updateItemForm}
                placeholder="Add color, brand, unique marks, last seen time, or where the item is kept."
                rows="5"
                required
              />
            </label>

            <label className="upload-box">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
              {itemForm.imageDataUrl ? (
                <img src={itemForm.imageDataUrl} alt="Preview of uploaded item" />
              ) : (
                <span>Upload item photo</span>
              )}
            </label>

            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save report"}
            </button>
          </form>
        </section>
      </section>

      <section className="feed-section">
        <ItemColumn title="Lost Reports" accent="blue" items={lostItems} />
        <ItemColumn title="Found Reports" accent="orange" items={foundItems} />
      </section>
    </main>
  );
}

function ItemColumn({ title, accent, items }) {
  return (
    <section className={`glass-panel item-column ${accent}`}>
      <div className="panel-heading">
        <p className="panel-label">Campus feed</p>
        <h2>{title}</h2>
      </div>
      <div className="item-list">
        {items.length === 0 ? (
          <p className="empty-state">No reports yet.</p>
        ) : (
          items.map((item) => <ItemCard item={item} key={item.id} />)
        )}
      </div>
    </section>
  );
}

function ItemCard({ item }) {
  return (
    <article className="item-card">
      {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
      <div>
        <div className="item-card-header">
          <strong>{item.title}</strong>
          <span>{item.type}</span>
        </div>
        <p>{item.description}</p>
        <div className="item-meta">
          <span>{item.location}</span>
          <span>By {item.userName}</span>
        </div>
      </div>
    </article>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default App;
