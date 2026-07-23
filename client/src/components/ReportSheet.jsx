export function ReportSheet({ onChoose, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <span className="sheet-grip" />
        <p className="panel-label">New report</p>
        <h2>What happened?</h2>
        <p>Choose one to start. You can add the details in the next step.</p>

        <button className="sheet-option lost" onClick={() => onChoose("lost")} type="button">
          <span className="sheet-option-label">Lost</span>
          <strong>I lost an item</strong>
          <small>Share where you last saw it so others can help.</small>
        </button>
        <button className="sheet-option found" onClick={() => onChoose("found")} type="button">
          <span className="sheet-option-label">Found</span>
          <strong>I found an item</strong>
          <small>Help the owner recognise and collect it safely.</small>
        </button>
      </div>
    </div>
  );
}
