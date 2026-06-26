import { formatDate } from "../utils/date.js";
import { getMatchConfidence } from "../utils/matching.js";
import { MatchEvidence, MatchSummaryCard } from "./MatchReview.jsx";

const CLAIM_STATUSES = ["sent", "reviewing", "accepted", "rejected"];

export function ItemDetail({
  claimForm,
  claims,
  currentUser,
  highConfidenceMatches = [],
  isClaimSaving,
  updatingClaimId = "",
  isResolving,
  item,
  matches,
  message,
  matchContext,
  onClaimChange,
  onClaimSubmit,
  onClaimStatusChange,
  onDismissMatch,
  onResolve,
  onSelectMatch
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
  const canShowMatchEvidence = matchContext && matchContext.foundItem.id === item.id && !isOwner;
  const currentUserClaim = !isOwner ? claims.find((claim) => claim.claimantId === currentUser.id) : null;

  return (
    <section className="glass-panel detail-panel" id="detail">
      <div className="detail-hero">
        {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
        <div>
          <p className="panel-label">{item.type} report</p>
          <h2>{item.title}</h2>
          <span className={`status-pill ${status}`}>{status}</span>
          <div className="trust-badges">
            <span className="trust-badge">NUS verified</span>
            {item.imageUrl && <span className="trust-badge">Photo by reporter</span>}
          </div>
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

      {canShowMatchEvidence && <MatchEvidence match={matchContext} />}

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
      ) : currentUserClaim ? (
        <div className="claim-sent-note">
          <div className="panel-heading compact">
            <p className="panel-label">Claim</p>
            <h3>Claim request already sent</h3>
          </div>
          <p>
            You already sent a claim request for this item. Its current status is{" "}
            <span className={`claim-status ${currentUserClaim.status || "sent"}`}>
              {currentUserClaim.status || "sent"}
            </span>
            .
          </p>
        </div>
      ) : (
        <form className="claim-form" onSubmit={onClaimSubmit}>
          <div className="panel-heading compact">
            <p className="panel-label">Claim</p>
            <h3>Send a claim request</h3>
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

      {isOwner && item.type === "lost" && highConfidenceMatches.length > 0 && (
        <section className="detail-section match-action-section">
          <div className="panel-heading compact">
            <p className="panel-label">Action Required</p>
            <h3>Verify These Found Items</h3>
          </div>
          <p className="detail-description">
            The following found reports are strong matches for your item. Review each one carefully and submit a claim
            only after confirming the details match.
          </p>
          <div className="match-list">
            {highConfidenceMatches.map((matchRecord) => (
              <MatchSummaryCard
                actionLabel="Review match"
                key={matchRecord.id}
                match={matchRecord}
                onDismiss={onDismissMatch}
                onReview={onSelectMatch}
              />
            ))}
          </div>
        </section>
      )}

      {isOwner && item.type === "lost" && (
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
                <button
                  className="match-card"
                  key={match.id}
                  onClick={() =>
                    onSelectMatch({
                      foundItem: match.type === "found" ? match : item,
                      id: item.type === "lost" ? `${item.id}:${match.id}` : `${match.id}:${item.id}`,
                      matchedLostItem: item.type === "lost" ? item : match,
                      origin: "detail",
                      reasons,
                      score
                    })
                  }
                  type="button"
                >
                  {match.imageUrl && <img src={match.imageUrl} alt={match.title} />}
                  <span>
                    <strong>{match.title}</strong>
                    {reasons.length ? (
                      <span className="reason-chips">
                        {reasons.map((reason) => (
                          <em className="reason-chip" key={reason}>{reason}</em>
                        ))}
                      </span>
                    ) : (
                      <small>{match.location}</small>
                    )}
                  </span>
                  <b>{getMatchConfidence(score)} match <em>{score}%</em></b>
                </button>
              ))
            )}
          </div>
        </section>
      )}

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
                <div className="claim-card-header">
                  <strong>{claim.claimantName}</strong>
                  <span className={`claim-status ${claim.status || "sent"}`}>{claim.status || "sent"}</span>
                </div>
                <p>{claim.message}</p>
                {isOwner && <small>{claim.contact}</small>}
                {isOwner && (
                  <div className="claim-status-actions" aria-label={`Update ${claim.claimantName}'s claim status`}>
                    {CLAIM_STATUSES.map((statusOption) => (
                      <button
                        className={`secondary-button ${claim.status === statusOption ? "active" : ""}`}
                        disabled={updatingClaimId === claim.id || (claim.status || "sent") === statusOption}
                        key={statusOption}
                        onClick={() => onClaimStatusChange(claim, statusOption)}
                        type="button"
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
