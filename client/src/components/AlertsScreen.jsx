import { getMatchConfidence } from "../utils/matching.js";

export function AlertsScreen({ alerts, onOpen }) {
  // TODO: let users dismiss an alert once they've checked it
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
          {alerts.map(({ item, reasons = [], score, sourceItem }) => (
            <button className="alert-card" key={item.id} onClick={() => onOpen(item.id)} type="button">
              {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
              <span>
                <strong>{item.title} may be yours</strong>
                <small>
                  Matches your “{sourceItem.title}” · {getMatchConfidence(score)} · {score}%
                </small>
                {reasons.length > 0 && (
                  <span className="reason-chips">
                    {reasons.map((reason) => (
                      <em className="reason-chip" key={reason}>{reason}</em>
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
