import { nusLocations } from "../constants/forms.js";

export function FeedControls({ filters, onChange }) {
  return (
    <div className="feed-controls">
      <div className="panel-heading">
        <p className="panel-label">Campus Feed</p>
        <h2>Found Items Feed</h2>
      </div>

      <label>
        Search
        <input name="query" value={filters.query} onChange={onChange} placeholder="wallet, AirPods, COM3..." />
      </label>

      <div className="filter-grid">
        <label>
          Status
          <select name="status" value={filters.status} onChange={onChange}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>
          Location
          <select name="location" value={filters.location} onChange={onChange}>
            <option value="all">All</option>
            {nusLocations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select name="sort" value={filters.sort} onChange={onChange}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
      </div>
    </div>
  );
}
