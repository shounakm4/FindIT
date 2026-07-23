import { useState } from "react";
import { nusLocations } from "../constants/forms.js";

export function ReportForm({ itemForm, isSaving, onChange, onImageChange, onSubmit }) {
  const [step, setStep] = useState(1);
  const isLost = itemForm.type === "lost";
  const reportLabel = isLost ? "lost item" : "found item";
  const detailsComplete = itemForm.title.trim() && itemForm.location && itemForm.description.trim();
  const photoComplete = isLost || itemForm.imageDataUrl;
  const reportSteps = ["Details", isLost ? "Photo (optional)" : "Photo", "Review"];

  return (
    <section className="glass-panel report-panel" id="report">
      <div className="panel-heading">
        <p className="panel-label">New report</p>
        <h2>Report a {reportLabel}</h2>
        <p className="report-intro">
          {step === 1 && "Enter the item details and location."}
          {step === 2 && (isLost ? "Photo upload is optional for lost item reports." : "Upload a clear photo of the item.")}
          {step === 3 && "Review the report details before publishing."}
        </p>
      </div>

      <form className="report-form" onSubmit={onSubmit}>
        <div className="report-steps" aria-label="Report progress">
          {[1, 2, 3].map((stepNumber) => (
            <span className={step === stepNumber ? "active" : step > stepNumber ? "complete" : ""} key={stepNumber}>
              {stepNumber}. {reportSteps[stepNumber - 1]}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="report-step">
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

            <label>
              Item name
              <input
                name="title"
                value={itemForm.title}
                onChange={onChange}
                placeholder={isLost ? "e.g. Black AirPods case" : "e.g. Blue water bottle"}
                required
              />
            </label>

            <label>
              {isLost ? "Last seen location" : "Found location"}
              <select name="location" value={itemForm.location} onChange={onChange} required>
                <option value="" disabled>Select a campus location</option>
                {nusLocations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </label>

            <label>
              Description
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

            <button
              className="primary-button"
              disabled={!detailsComplete}
              onClick={() => setStep(2)}
              type="button"
            >
              Continue to photo
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="report-step">
            <label className="upload-box">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} />
              {itemForm.imageDataUrl ? (
                <img src={itemForm.imageDataUrl} alt="Preview of uploaded item" />
              ) : (
                <span>
                  <strong>Tap to add a photo</strong>
                  <small>PNG, JPG or WebP · {isLost ? "optional" : "required"}</small>
                </span>
              )}
            </label>

            <p className="report-tip">
              {isLost
                ? "A detailed description can be used when no photo is available."
                : "Use a clear photo without personal documents, faces, or answers to security questions."}
            </p>

            <div className="report-step-actions">
              <button className="secondary-button" onClick={() => setStep(1)} type="button">Back</button>
              <button
                className="primary-button"
                disabled={!photoComplete}
                onClick={() => setStep(3)}
                type="button"
              >
                Review report
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="report-step">
            <div className={`report-review ${itemForm.imageDataUrl ? "" : "text-only"}`}>
              {itemForm.imageDataUrl && <img src={itemForm.imageDataUrl} alt="" />}
              <div>
                <span className={`type-chip ${itemForm.type}`}>{itemForm.type}</span>
                <h3>{itemForm.title}</h3>
                <strong>{itemForm.location}</strong>
                <p>{itemForm.description}</p>
              </div>
            </div>

            <div className="report-step-actions">
              <button className="secondary-button" onClick={() => setStep(2)} type="button">Back</button>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Publishing..." : `Publish ${reportLabel} report`}
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
