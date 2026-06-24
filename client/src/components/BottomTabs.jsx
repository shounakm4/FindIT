import { Icon } from "./Icon.jsx";

export function BottomTabs({ active, onReport, onTab }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      <button className={`tab ${active === "feed" ? "active" : ""}`} onClick={() => onTab("feed")} type="button">
        <Icon name="feed" />
        <span>Feed</span>
      </button>
      <button className="tab-fab" onClick={onReport} type="button" aria-label="Report an item">
        <Icon name="plus" size={26} />
      </button>
      <button className={`tab ${active === "account" ? "active" : ""}`} onClick={() => onTab("account")} type="button">
        <Icon name="account" />
        <span>Account</span>
      </button>
    </nav>
  );
}
