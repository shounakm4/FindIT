import { useState } from "react";
import { formatDate } from "../utils/date.js";
import { MatchSummaryCard } from "./MatchReview.jsx";

export function AccountPanel({
  claimSummary = { total: 0, sent: 0, reviewing: 0, accepted: 0, rejected: 0 },
  currentUser,
  matchReviews = [],
  onDismissMatch,
  onOpenItem,
  onReviewMatch,
  onSaveTelegram,
  onSignOut,
  userFoundItems = [],
  userLostItems = []
}) {
  const activeLostItems = userLostItems.filter((item) => (item.status || "open") === "open");
  const activeFoundItems = userFoundItems.filter((item) => (item.status || "open") === "open");
  const resolvedLostItems = userLostItems.filter((item) => item.status === "resolved");
  const resolvedFoundItems = userFoundItems.filter((item) => item.status === "resolved");
  const reportsSummary = [
    { label: "Active lost", value: activeLostItems.length },
    { label: "Active found", value: activeFoundItems.length },
    { label: "Resolved reports", value: resolvedLostItems.length + resolvedFoundItems.length },
    { label: "Claims", value: claimSummary.total }
  ];

  const [telegram, setTelegram] = useState(currentUser.telegramContact || "");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");

  async function saveTelegram(event) {
    event.preventDefault();
    setTelegramMessage("");

    try {
      setSavingTelegram(true);
      await onSaveTelegram(telegram);
      setTelegramMessage("Telegram contact saved.");
    } catch (error) {
      setTelegramMessage(error.message || "Could not save your contact.");
    } finally {
      setSavingTelegram(false);
    }
  }

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

      <section className="account-contact">
        <div className="panel-heading compact">
          <p className="panel-label">Contact</p>
          <h3>Telegram</h3>
        </div>
        <form className="telegram-form" onSubmit={saveTelegram}>
          <label>
            Telegram handle
            <input
              name="telegram"
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder="@yourhandle"
            />
          </label>
          {!currentUser.telegramContact && (
            <p className="empty-state">Add this so people can reach you about claims.</p>
          )}
          <button className="primary-button" disabled={savingTelegram} type="submit">
            {savingTelegram ? "Saving..." : "Save contact"}
          </button>
          {telegramMessage && <p className="message">{telegramMessage}</p>}
        </form>
      </section>

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

      {matchReviews.length > 0 && (
        <section className="account-matches">
          <div className="panel-heading compact">
            <p className="panel-label">Review</p>
            <h3>Matches to review</h3>
          </div>
          <div className="match-list">
            {matchReviews.map((match) => (
              <MatchSummaryCard
                actionLabel="Review match"
                key={match.id}
                match={match}
                onDismiss={onDismissMatch}
                onReview={onReviewMatch}
              />
            ))}
          </div>
        </section>
      )}

      <section className="account-history">
        <div className="panel-heading compact">
          <p className="panel-label">Reports</p>
          <h3>Report History</h3>
        </div>

        {userLostItems.length === 0 && userFoundItems.length === 0 ? (
          <p className="empty-state">You haven't reported any items yet.</p>
        ) : (
          <>
            {userLostItems.length > 0 && (
              <HistoryGroup items={userLostItems} onOpenItem={onOpenItem} title="Lost items" />
            )}
            {userFoundItems.length > 0 && (
              <HistoryGroup items={userFoundItems} onOpenItem={onOpenItem} title="Found items" />
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
            <small>{item.type} · {item.location}</small>
            <small>{formatDate(item.createdAt)}</small>
            <span className={`status-pill ${item.status || "open"}`}>{item.status || "open"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
