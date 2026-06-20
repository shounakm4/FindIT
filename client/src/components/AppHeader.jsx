export function AppHeader({ currentUser, onNavigate }) {
  return (
    <header className="app-header">
      <div>
        <img className="brand-logo" src="/logo.svg" alt="FindIT" />
      </div>
      <a className="header-profile" href="#account" onClick={(event) => onNavigate(event, "account")}>
        <span>{currentUser.name.charAt(0).toUpperCase()}</span>
      </a>
    </header>
  );
}
