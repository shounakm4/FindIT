export function BottomTabs({ onNavigate }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      <a className="primary-tab" href="#report" onClick={(event) => onNavigate(event, "report")}>
        Report
      </a>
      <a href="#feed" onClick={(event) => onNavigate(event, "feed")}>
        Feed
      </a>
      <a href="#detail" onClick={(event) => onNavigate(event, "detail")}>
        Detail
      </a>
      <a href="#account" onClick={(event) => onNavigate(event, "account")}>
        Account
      </a>
    </nav>
  );
}
