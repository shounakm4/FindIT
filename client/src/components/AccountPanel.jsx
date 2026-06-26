import { formatDate } from "../utils/date.js";

export function AccountPanel({
  claimSummary = { total: 0, sent: 0, reviewing: 0, accepted: 0, rejected: 0 },
  currentUser,
  onOpenItem,
  onSignOut,
  userLostItems = []
}) {
  const activeItems = userLostItems.filter((item) => (item.status || "open") === "open");
  const resolvedItems = userLostItems.filter((item) => item.status === "resolved");
  const reportsSummary = [
    { label: "Active lost", value: activeItems.length },
    { label: "Resolved lost", value: resolvedItems.length },
    { label: "Claims", value: claimSummary.total }
  ];

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

      <section className="reports-shortcut">
        <div className="panel-heading compact">
          <p className="panel-label">My reports</p>
          <h3>Report overview</h3>
        </div>
        <div className="reports-summary-grid">
          {reportsSummary.map((item) => (
            <div className="summary-stat" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        {claimSummary.total > 0 && (
          <div className="claim-status-summary" aria-label="Claim status summary">
            <span>{claimSummary.sent} sent</span>
            <span>{claimSummary.reviewing} reviewing</span>
            <span>{claimSummary.accepted} accepted</span>
            <span>{claimSummary.rejected} rejected</span>
          </div>
        )}
      </section>

      <section className="account-history">
        <div className="panel-heading compact">
          <p className="panel-label">Reports</p>
          <h3>Lost Items History</h3>
        </div>

        {userLostItems.length === 0 ? (
          <p className="empty-state">You haven't reported any lost items yet.</p>
        ) : (
          <>
            {activeItems.length > 0 && <HistoryGroup items={activeItems} onOpenItem={onOpenItem} title="Active" />}
            {resolvedItems.length > 0 && (
              <HistoryGroup items={resolvedItems} onOpenItem={onOpenItem} title="Resolved" />
            )}
          </>
        )}
      </section>
    </aside>
  );
}

function HistoryGroup({ items, onOpenItem, title }) {
  return (
    <div className="history-group">
      <h4>{title}</h4>
      <div className="history-list">
        {items.map((item) => (
          <button className="history-item" key={item.id} onClick={() => onOpenItem(item.id)} type="button">
            <strong>{item.title}</strong>
            <small>{item.location}</small>
            <small>{formatDate(item.createdAt)}</small>
            <span className={`status-pill ${item.status || "open"}`}>{item.status || "open"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
