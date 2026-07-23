import { useState } from "react";

export function AuthCard({
  authForm,
  authMode,
  isSubmitting,
  message,
  onAuthModeChange,
  onAuthSubmit,
  onFormChange,
  onResetPassword,
  onResendVerification
}) {
  const [showPassword, setShowPassword] = useState(false);
  const canResetPassword = authForm.email.trim();
  const canResendVerification = authForm.email.trim() && authForm.password.trim();

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
          <>
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
            <label>
              Telegram
              <input
                name="telegramContact"
                value={authForm.telegramContact}
                onChange={onFormChange}
                placeholder="@telegramhandle"
                required
              />
            </label>
          </>
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
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={authForm.password}
              onChange={onFormChange}
              placeholder={authMode === "register" ? "Choose a password" : "Enter your password"}
              required
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {authMode === "login" && (
          <button
            className="reset-password-button"
            disabled={isSubmitting || !canResetPassword}
            onClick={onResetPassword}
            type="button"
          >
            Forgot password?
          </button>
        )}
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait..." : authMode === "register" ? "Create account" : "Log in"}
        </button>
        {authMode === "login" && (
          <button
            className="secondary-button"
            disabled={isSubmitting || !canResendVerification}
            onClick={onResendVerification}
            type="button"
          >
            Resend verification email
          </button>
        )}
      </form>

      {message && <p className="message">{message}</p>}
    </section>
  );
}
