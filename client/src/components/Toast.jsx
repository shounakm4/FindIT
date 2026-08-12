export function Toast({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button aria-label="Dismiss message" onClick={onClose} type="button">
        ×
      </button>
    </div>
  );
}
