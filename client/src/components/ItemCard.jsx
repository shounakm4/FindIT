import { relativeTime } from "../utils/date.js";
import { getMatchConfidence } from "../utils/matching.js";

export function ItemCard({ item, matchScore, onSelect }) {
  return (
    <button className="item-card" onClick={onSelect} type="button">
      {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
      <div>
        <div className="item-card-header">
          <strong>{item.title}</strong>
          <span className={`type-chip ${item.type}`}>{item.type}</span>
        </div>
        <p>{item.description}</p>
        <div className="item-meta">
          <span>{item.location} · {relativeTime(item.createdAt)}</span>
          <span className={`status-pill ${item.status || "open"}`}>{item.status || "open"}</span>
        </div>
        {typeof matchScore === "number" && matchScore > 0 && (
          <div className="match-meter">
            <span style={{ width: `${matchScore}%` }} />
            <b>{getMatchConfidence(matchScore)} match <em>{matchScore}%</em></b>
          </div>
        )}
      </div>
    </button>
  );
}
