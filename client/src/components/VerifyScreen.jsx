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
          {verifyMatches.map(({ foundItem, matchedLostItem, score }) => (
            <article className="verify-card" key={foundItem.id}>
              {foundItem.imageUrl && <img src={foundItem.imageUrl} alt={foundItem.title} />}
              <div>
                <strong>{foundItem.title}</strong>
                <small>{foundItem.location}</small>
                <small>{score}% match</small>
                <small>Matched against: {matchedLostItem.title}</small>
              </div>
              <div className="verify-actions">
                <button className="secondary-button" onClick={() => onReview(foundItem.id)} type="button">
                  Review
                </button>
                <button className="secondary-button" onClick={() => onDismiss(foundItem.id)} type="button">
                  Dismiss
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
