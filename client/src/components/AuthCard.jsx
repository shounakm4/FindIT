export function AuthCard({ authForm, authMode, message, onAuthModeChange, onAuthSubmit, onFormChange }) {
  return (
    <section className="glass-panel auth-card">
      <div className="panel-heading">
        <p className="panel-label">Get Started</p>
        <h2>{authMode === "register" ? "Create Account" : "Log In"}</h2>
      </div>

      <div className="segmented-control" aria-label="Choose authentication mode">
        <button
          className={authMode === "register" ? "active" : ""}
          onClick={() => onAuthModeChange("register")}
          type="button"
        >
          Register
        </button>
        <button
          className={authMode === "login" ? "active" : ""}
          onClick={() => onAuthModeChange("login")}
          type="button"
        >
          Login
        </button>
      </div>

      <form className="stacked-form" onSubmit={onAuthSubmit}>
        {authMode === "register" && (
          <label>
            Name
            <input
              name="name"
              value={authForm.name}
              onChange={onFormChange}
              placeholder="Your Name"
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
            onChange={onFormChange}
            placeholder="exxxxxxx@u.nus.edu"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={authForm.password}
            onChange={onFormChange}
            placeholder={authMode === "register" ? "Choose a password" : "Enter your password"}
            required
          />
        </label>
        <button className="primary-button" type="submit">
          {authMode === "register" ? "Create account" : "Log in"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </section>
  );
}
