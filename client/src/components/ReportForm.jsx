import { nusLocations } from "../constants/forms.js";

export function ReportForm({ itemForm, isSaving, onChange, onImageChange, onSubmit }) {
  const isLost = itemForm.type === "lost";
  const reportLabel = isLost ? "lost item" : "found item";

  return (
    <section className="glass-panel report-panel" id="report">
      <div className="panel-heading">
        <p className="panel-label">New report</p>
        <h2>Report a {reportLabel}</h2>
        <p className="report-intro">
          {isLost
            ? "Give enough detail for someone to recognise what you are looking for."
            : "Add the details an owner would need to identify their item."}
        </p>
      </div>

      <form className="report-form" onSubmit={onSubmit}>
        <div className="report-steps" aria-label="Report steps">
          <span className="active">1. Details</span>
          <span>2. Photo</span>
          <span>3. Publish</span>
        </div>

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
            What is the item?
            <input
              name="title"
              value={itemForm.title}
              onChange={onChange}
              placeholder={isLost ? "e.g. Black AirPods case" : "e.g. Blue water bottle"}
              required
            />
          </label>
          <label>
            {isLost ? "Last seen at" : "Found at"}
            <select name="location" value={itemForm.location} onChange={onChange} required>
              <option value="" disabled>
                Select a location
              </option>
              {nusLocations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Details that help identify it
          <textarea
            name="description"
            value={itemForm.description}
            onChange={onChange}
            placeholder={
              isLost
                ? "Colour, brand, unique marks, and when you last saw it."
                : "Colour, brand, unique marks, and where you are keeping it."
            }
            rows="5"
            required
          />
        </label>

        <label className="upload-box">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} required />
          {itemForm.imageDataUrl ? (
            <img src={itemForm.imageDataUrl} alt="Preview of uploaded item" />
          ) : (
            <span>
              <strong>Add a clear photo</strong>
              <small>Required · helps people verify the item</small>
            </span>
          )}
        </label>

        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Publishing..." : `Publish ${reportLabel} report`}
        </button>
      </form>
    </section>
  );
}
