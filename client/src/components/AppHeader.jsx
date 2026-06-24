function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function AppHeader({ currentUser, onNavigate }) {
  const firstName = currentUser.name.split(" ")[0];

  return (
    <header className="app-header">
      <div className="header-brand">
        <img className="brand-logo" src="/logo.svg" alt="FindIT" />
        <p className="greeting">{getGreeting()}, {firstName}</p>
      </div>
      <a className="header-profile" href="#account" onClick={(event) => onNavigate(event, "account")}>
        <span>{currentUser.name.charAt(0).toUpperCase()}</span>
      </a>
    </header>
  );
}
