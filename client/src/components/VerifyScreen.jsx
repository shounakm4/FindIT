import { MatchSummaryCard } from "./MatchReview.jsx";

export function VerifyScreen({ verifyMatches = [], onDismiss, onReview }) {
  return (
    <section className="glass-panel verify-screen">
      <div className="panel-heading">
        <p className="panel-label">Possible Found Items</p>
        <h2>Verify Matches</h2>
      </div>

      {verifyMatches.length === 0 ? (
        <p className="empty-state">No potential matches to verify right now.</p>
      ) : (
        <div className="verify-list">
          {verifyMatches.map((match) => (
            <MatchSummaryCard
              actionLabel="Review match"
              key={match.id}
              match={match}
              onDismiss={onDismiss}
              onReview={onReview}
            />
          ))}
        </div>
      )}
    </section>
  );
}
