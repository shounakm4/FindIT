export function ReportSheet({ onChoose, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <span className="sheet-grip" />
        <h2>What would you like to report?</h2>
        <p>Start a report for something you lost, or help return something you found.</p>

        <button className="sheet-option lost" onClick={() => onChoose("lost")} type="button">
          <strong>I lost something</strong>
          <small>Create a lost report · AI matching</small>
        </button>
        <button className="sheet-option found" onClick={() => onChoose("found")} type="button">
          <strong>I found something</strong>
          <small>Report a found item · notify the owner</small>
        </button>
      </div>
    </div>
  );
}
