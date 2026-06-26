export function formatDate(value) {
  const date = toValidDate(value);

  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function relativeTime(value) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function toValidDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return toValidDate(value.toDate());
  }

  const seconds = Number(value.seconds ?? value._seconds);
  if (Number.isFinite(seconds)) {
    return new Date(seconds * 1000);
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
