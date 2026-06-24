import { formatDate } from "../utils/date.js";
import { getMatchConfidence } from "../utils/matching.js";

export function ItemDetail({
  claimForm,
  claims,
  currentUser,
  isClaimSaving,
  isResolving,
  item,
  matches,
  message,
  onClaimChange,
  onClaimSubmit,
  onResolve,
  onSelectItem
}) {
  if (!item) {
    return (
      <section className="glass-panel detail-panel" id="detail">
        <div className="panel-heading">
          <p className="panel-label">Detail</p>
          <h2>Select a Report</h2>
        </div>
        <p className="empty-state">Choose a report from the feed to view details, claims, and possible matches.</p>
      </section>
    );
  }

  const isOwner = item.userId === currentUser.id;
  const status = item.status || "open";

  return (
    <section className="glass-panel detail-panel" id="detail">
      <div className="detail-hero">
        {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
        <div>
          <p className="panel-label">{item.type} report</p>
          <h2>{item.title}</h2>
          <span className={`status-pill ${status}`}>{status}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <strong>Location</strong>
          <p>{item.location}</p>
        </div>
        <div>
          <strong>Reported by</strong>
          <p>{item.userName}</p>
        </div>
        <div>
          <strong>Posted</strong>
          <p>{formatDate(item.createdAt)}</p>
        </div>
        {status === "resolved" && (
          <div>
            <strong>Resolved</strong>
            <p>{formatDate(item.resolvedAt)}</p>
          </div>
        )}
      </div>

      <p className="detail-description">{item.description}</p>

      {isOwner ? (
        <div className="owner-actions">
          <button
            className="primary-button"
            disabled={status === "resolved" || isResolving}
            onClick={onResolve}
            type="button"
          >
            {isResolving ? "Resolving..." : status === "resolved" ? "Resolved" : "Mark as resolved"}
          </button>
        </div>
      ) : status === "resolved" ? (
        <p className="empty-state resolved-note">This report has been resolved, so new claim requests are closed.</p>
      ) : (
        <form className="claim-form" onSubmit={onClaimSubmit}>
          <div className="panel-heading compact">
            <p className="panel-label">Claim</p>
            <h3>{item.type === "lost" ? "I found this" : "This might be mine"}</h3>
          </div>
          <label>
            Message
            <textarea
              name="message"
              value={claimForm.message}
              onChange={onClaimChange}
              placeholder="Share details that help verify the item."
              rows="4"
              required
            />
          </label>
          <label>
            Contact
            <input
              name="contact"
              value={claimForm.contact}
              onChange={onClaimChange}
              placeholder="Telegram handle, phone, or email"
              required
            />
          </label>
          <button className="primary-button" disabled={isClaimSaving} type="submit">
            {isClaimSaving ? "Sending..." : "Send request"}
          </button>
        </form>
      )}

      {message && <p className="message">{message}</p>}

      <section className="detail-section">
        <div className="panel-heading compact">
          <p className="panel-label">Possible Matches</p>
          <h3>Photo and text score</h3>
        </div>
        <div className="match-list">
          {matches.length === 0 ? (
            <p className="empty-state">No strong matches yet.</p>
          ) : (
            matches.map(({ item: match, reasons = [], score }) => (
              <button className="match-card" key={match.id} onClick={() => onSelectItem(match.id)} type="button">
                {match.imageUrl && <img src={match.imageUrl} alt={match.title} />}
                <span>
                  <strong>{match.title}</strong>
                  <small>{reasons.length ? reasons.join(", ") : match.location}</small>
                </span>
                <b>{getMatchConfidence(score)} match <em>{score}%</em></b>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="panel-heading compact">
          <p className="panel-label">Claims</p>
          <h3>{claims.length} request{claims.length === 1 ? "" : "s"}</h3>
        </div>
        <div className="claim-list">
          {claims.length === 0 ? (
            <p className="empty-state">No claim requests yet.</p>
          ) : (
            claims.map((claim) => (
              <article className="claim-card" key={claim.id}>
                <strong>{claim.claimantName}</strong>
                <p>{claim.message}</p>
                {isOwner && <small>{claim.contact}</small>}
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
