import { MatchSummaryCard } from "./MatchReview.jsx";

export function AlertsScreen({ alerts, onDismissAlert, onOpenClaim, onReviewMatch }) {
  return (
    <section className="alerts-screen">
      <div className="panel-heading">
        <p className="panel-label">Alerts</p>
        <h2>Possible matches</h2>
      </div>

      {alerts.length === 0 ? (
        <p className="empty-state">
          No match alerts yet. When a found item looks like one of your reports, it will show up here.
        </p>
	      ) : (
	        <div className="alert-list">
	          {alerts.map((alert) => {
	            if (alert.type === "claim") {
	              return (
	                <article className="alert-card text-only" key={alert.id}>
	                  <button className="alert-card-main" onClick={() => onOpenClaim(alert.itemId)} type="button">
	                    <strong>{alert.claimantName} sent a claim</strong>
	                    <small>
	                      {alert.itemTitle} · {alert.itemType} report
	                    </small>
	                    {alert.message && (
	                      <span className="reason-chips">
	                        <em className="reason-chip">{alert.message}</em>
	                      </span>
	                    )}
	                  </button>
	                  <button className="secondary-button quiet" onClick={() => onDismissAlert(alert)} type="button">
	                    Dismiss
	                  </button>
	                </article>
	              );
	            }

	            return (
	              <MatchSummaryCard
	                actionLabel="Review match"
	                dismissLabel="Dismiss"
	                key={alert.id}
	                match={alert}
	                onDismiss={onDismissAlert}
	                onReview={onReviewMatch}
	              />
	            );
	          })}
	        </div>
      )}
    </section>
  );
}
