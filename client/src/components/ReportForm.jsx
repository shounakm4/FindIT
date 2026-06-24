import { itemCategories } from "../constants/forms.js";

export function ReportForm({ itemForm, isSaving, onChange, onImageChange, onSubmit }) {
  return (
    <section className="glass-panel report-panel" id="report">
      <div className="panel-heading">
        <p className="panel-label">Report</p>
        <h2>Report an Item</h2>
      </div>

      <form className="report-form" onSubmit={onSubmit}>
        <div className="type-toggle">
          <label className={itemForm.type === "lost" ? "selected" : ""}>
            <input
              type="radio"
              name="type"
              value="lost"
              checked={itemForm.type === "lost"}
              onChange={onChange}
            />
            Lost item
          </label>
          <label className={itemForm.type === "found" ? "selected" : ""}>
            <input
              type="radio"
              name="type"
              value="found"
              checked={itemForm.type === "found"}
              onChange={onChange}
            />
            Found item
          </label>
        </div>

        <div className="form-row">
          <label>
            Item name
            <input name="title" value={itemForm.title} onChange={onChange} placeholder="AirPods Pro" required />
          </label>
          <label>
            Location
            <input name="location" value={itemForm.location} onChange={onChange} placeholder="COM3, Level 2" required />
          </label>
        </div>

        <label>
          Category
          <select name="category" value={itemForm.category} onChange={onChange}>
            {itemCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={itemForm.description}
            onChange={onChange}
            placeholder="Add color, brand, unique marks, last seen time, or where the item is kept."
            rows="5"
            required
          />
        </label>

        <label className="upload-box">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} required />
          {itemForm.imageDataUrl ? (
            <img src={itemForm.imageDataUrl} alt="Preview of uploaded item" />
          ) : (
            <span>Upload item photo</span>
          )}
        </label>

        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save report"}
        </button>
      </form>
    </section>
  );
}
