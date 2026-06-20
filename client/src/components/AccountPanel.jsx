export function AccountPanel({ currentUser, onSignOut }) {
  return (
    <aside className="glass-panel account-panel" id="account">
      <div className="panel-heading">
        <p className="panel-label">Account</p>
        <h2>Your Profile</h2>
      </div>

      <div className="signed-in-card">
        <div className="avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
        <div>
          <strong>{currentUser.name}</strong>
          <p>{currentUser.email}</p>
        </div>
        <button className="secondary-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
