import { getMatchConfidence } from "../utils/matching.js";

export function MatchScreen({ match, onClaim, onDismiss }) {
  const { item, reasons = [], score, sourceItem } = match;

  return (
    <section className="match-screen">
      <div className="match-screen-head">
        <span className="match-screen-badge">✦ We found a match</span>
        <h2>Looks like we found your {sourceItem.title}.</h2>
        <p>{getMatchConfidence(score)} confidence · {score}% similar</p>
      </div>

      <div className="match-screen-card">
        {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
        <strong>{item.title}</strong>
        <small>{item.location}</small>

        <div className="match-score-row">
          <span>AI match score</span>
          <b>{score}%</b>
        </div>
        <div className="match-meter">
          <span style={{ width: `${score}%` }} />
        </div>

        {reasons.length > 0 && (
          <div className="reason-chips">
            {reasons.map((reason) => (
              <em className="reason-chip" key={reason}>{reason}</em>
            ))}
          </div>
        )}
      </div>

      <div className="match-screen-actions">
        <button className="primary-button" onClick={onClaim} type="button">
          That's mine — claim it
        </button>
        <button className="ghost-button" onClick={onDismiss} type="button">
          Not mine — keep looking
        </button>
      </div>
    </section>
  );
}
