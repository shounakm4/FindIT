import { HIGH_CONFIDENCE_MATCH_THRESHOLD, getMatchConfidence } from "../utils/matching.js";

export function MatchSummaryCard({
  actionLabel = "Review match",
  dismissLabel = "Not mine",
  match,
  onDismiss,
  onReview,
  showDismiss = true
}) {
  const { foundItem, matchedLostItem, reasons = [], score = 0 } = match;
  const confidence = getMatchConfidence(score);
  const foundReporterContact = getFoundReporterContact(foundItem);
  const showFoundReporterContact = score >= HIGH_CONFIDENCE_MATCH_THRESHOLD && foundReporterContact.value;

  return (
    <article
      className={`match-summary-card ${score >= HIGH_CONFIDENCE_MATCH_THRESHOLD ? "high" : "possible"} ${
        foundItem.imageUrl ? "" : "text-only"
      }`}
    >
      {foundItem.imageUrl && <img src={foundItem.imageUrl} alt={foundItem.title} />}
      <div className="match-summary-body">
        <div className="match-summary-title">
          <strong>{foundItem.title}</strong>
          <span>{confidence}</span>
        </div>
        <small>
          Matches your "{matchedLostItem.title}" · {score}%
        </small>
        {reasons.length > 0 && (
          <span className="reason-chips">
            {reasons.map((reason) => (
              <em className="reason-chip" key={reason}>{reason}</em>
            ))}
          </span>
        )}
        <small>{foundItem.location}</small>
        {showFoundReporterContact && (
          <small className="match-contact">
            {foundReporterContact.label}: {foundReporterContact.value}
          </small>
        )}
      </div>
      <div className="match-summary-actions">
        <button className="secondary-button" onClick={() => onReview(match)} type="button">
          {actionLabel}
        </button>
        {showDismiss && (
	          <button className="secondary-button quiet" onClick={() => onDismiss(match)} type="button">
	            {dismissLabel}
	          </button>
        )}
      </div>
    </article>
  );
}

export function MatchEvidence({ match }) {
  const { foundItem, matchedLostItem, reasons = [], score = 0 } = match;
  const confidence = getMatchConfidence(score);
  const foundReporterContact = getFoundReporterContact(foundItem);

  return (
    <section className="match-evidence">
      <div className="panel-heading compact">
        <p className="panel-label">Match Review</p>
        <h3>{confidence} confidence match</h3>
      </div>

      <div className="match-score-row">
        <span>Match score</span>
        <b>{score}%</b>
      </div>
      <div className="match-meter">
        <span style={{ width: `${score}%` }} />
        <b>{confidence} match</b>
      </div>

      <div className="match-pair">
        <ReportSnapshot label="Your lost report" item={matchedLostItem} />
        <ReportSnapshot label="Found report" item={foundItem} />
      </div>

      {reasons.length > 0 ? (
        <div className="reason-chips">
          {reasons.map((reason) => (
            <em className="reason-chip" key={reason}>{reason}</em>
          ))}
        </div>
      ) : (
        <p className="detail-description">Strong similarity across report details.</p>
      )}

      {score >= HIGH_CONFIDENCE_MATCH_THRESHOLD && foundReporterContact.value && (
        <p className="match-contact">
          {foundReporterContact.label}: {foundReporterContact.value}
        </p>
      )}
    </section>
  );
}

export function MatchReviewPanel({ match, onClaim, onDismiss, onViewDetails }) {
  const { foundItem } = match;

  return (
    <section className="glass-panel match-review-screen">
      <MatchEvidence match={match} />

      <div className="match-review-actions">
        <button className="primary-button" onClick={() => onClaim(match)} type="button">
          Claim this item
        </button>
        <button className="secondary-button" onClick={() => onDismiss(match)} type="button">
          Not mine
        </button>
        <button className="ghost-light-button" onClick={() => onViewDetails(foundItem.id, match)} type="button">
          View full report details
        </button>
      </div>
    </section>
  );
}

function ReportSnapshot({ item, label }) {
  return (
    <article className="match-report-snapshot">
      {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
      <div>
        <small>{label}</small>
        <strong>{item.title}</strong>
        <span>{item.location}</span>
      </div>
    </article>
  );
}

function getFoundReporterContact(foundItem) {
  if (foundItem.userTelegramContact) {
    return {
      label: "Found reporter Telegram",
      value: foundItem.userTelegramContact
    };
  }

  if (foundItem.userEmail) {
    return {
      label: "Found reporter email",
      value: foundItem.userEmail
    };
  }

  return {
    label: "",
    value: ""
  };
}
