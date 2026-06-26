import { Icon } from "./Icon.jsx";

export function BottomTabs({ active, alertCount = 0, verifyCount = 0, onReport, onTab }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      <button className={`tab ${active === "feed" ? "active" : ""}`} onClick={() => onTab("feed")} type="button">
        <Icon name="feed" />
        <span>Feed</span>
      </button>
      <button className={`tab ${active === "alerts" ? "active" : ""}`} onClick={() => onTab("alerts")} type="button">
        <span className="tab-icon">
          <Icon name="alerts" />
          {alertCount > 0 && <span className="tab-badge">{alertCount}</span>}
        </span>
        <span>Alerts</span>
      </button>
      <button className="tab-fab" onClick={onReport} type="button" aria-label="Report an item">
        <Icon name="plus" size={26} />
      </button>
      <button className={`tab ${active === "verify" ? "active" : ""}`} onClick={() => onTab("verify")} type="button">
        <span className="tab-icon">
          <Icon name="verify" />
          {verifyCount > 0 && <span className="tab-badge">{verifyCount}</span>}
        </span>
        <span>Verify</span>
      </button>
      <button className={`tab ${active === "account" ? "active" : ""}`} onClick={() => onTab("account")} type="button">
        <Icon name="account" />
        <span>Account</span>
      </button>
    </nav>
  );
}
