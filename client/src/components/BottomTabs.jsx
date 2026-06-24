export function BottomTabs({ hasSelection, onNavigate }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      <a className="primary-tab" href="#report" onClick={(event) => onNavigate(event, "report")}>
        Report
      </a>
      <a href="#feed" onClick={(event) => onNavigate(event, "feed")}>
        Feed
      </a>
      {hasSelection ? (
        <a href="#detail" onClick={(event) => onNavigate(event, "detail")}>
          Detail
        </a>
      ) : (
        <span className="disabled-tab" aria-disabled="true">
          Detail
        </span>
      )}
      <a href="#account" onClick={(event) => onNavigate(event, "account")}>
        Account
      </a>
    </nav>
  );
}
