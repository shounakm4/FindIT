const PATHS = {
  feed: "M3 11l9-8 9 8M5 9v11h5v-6h4v6h5V9",
  plus: "M12 5v14M5 12h14",
  account: "M4 21c0-4 4-6 8-6s8 2 8 6M12 11a4 4 0 100-8 4 4 0 000 8",
  back: "M15 19l-7-7 7-7"
};

export function Icon({ name, size = 22 }) {
  const path = PATHS[name];

  if (!path) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={path} />
    </svg>
  );
}
