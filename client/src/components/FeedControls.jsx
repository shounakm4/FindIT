import { itemCategories } from "../constants/forms.js";

export function FeedControls({ filters, onChange, onSelectCategory }) {
  const categories = ["all", ...itemCategories];

  return (
    <div className="feed-controls">
      <div className="panel-heading">
        <p className="panel-label">Campus Feed</p>
        <h2>Search Reports</h2>
      </div>

      <label>
        Search
        <input name="query" value={filters.query} onChange={onChange} placeholder="wallet, AirPods, COM3..." />
      </label>

      <div className="category-chips">
        {categories.map((category) => (
          <button
            className={`chip ${filters.category === category ? "active" : ""}`}
            key={category}
            onClick={() => onSelectCategory(category)}
            type="button"
          >
            {category === "all" ? "All" : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <div className="filter-grid">
        <label>
          Type
          <select name="type" value={filters.type} onChange={onChange}>
            <option value="all">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" value={filters.status} onChange={onChange}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
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
