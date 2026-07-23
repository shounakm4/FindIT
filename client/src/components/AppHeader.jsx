import { Icon } from "./Icon.jsx";

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

export function AppHeader({ chatCount = 0, currentUser, isChatActive, onOpenAccount, onOpenChat }) {
  const firstName = currentUser.name.split(" ")[0];

  return (
    <header className="app-header">
      <div className="header-brand">
        <img className="brand-logo" src="/logo.svg" alt="FindIT" />
        <p className="greeting">{getGreeting()}, {firstName}</p>
      </div>
      <div className="header-actions">
        <button
          aria-label="Open chats"
          className={`header-chat ${isChatActive ? "active" : ""}`}
          onClick={onOpenChat}
          type="button"
        >
          <Icon name="chat" size={21} />
          {chatCount > 0 && <span className="header-chat-badge">{chatCount}</span>}
        </button>
        <button className="header-profile" onClick={onOpenAccount} type="button">
          <span>{currentUser.name.charAt(0).toUpperCase()}</span>
        </button>
      </div>
    </header>
  );
}
