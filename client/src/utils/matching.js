const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "item",
  "lost",
  "found",
  "from",
  "near",
  "level",
  "floor"
]);

export function filterAndSortItems(items, filters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const sortedItems = [...items].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return filters.sort === "oldest" ? left - right : right - left;
  });

  return sortedItems.filter((item) => {
    const matchesType = filters.type === "all" || item.type === filters.type;
    const matchesStatus = filters.status === "all" || (item.status || "open") === filters.status;
    const searchable = `${item.title} ${item.description} ${item.location} ${item.userName}`.toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

    return matchesType && matchesStatus && matchesQuery;
  });
}

export function findMatchSuggestions(items, selectedItem) {
  if (!selectedItem) {
    return [];
  }

  return items
    .filter((item) => item.id !== selectedItem.id && item.type !== selectedItem.type && (item.status || "open") === "open")
    .map((candidate) => ({
      item: candidate,
      score: calculateMatchScore(selectedItem, candidate)
    }))
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function buildSearchKeywords(report) {
  return tokenize(`${report.title} ${report.description} ${report.location}`);
}

export function calculateMatchScore(baseItem, candidate) {
  if (!baseItem || !candidate || baseItem.type === candidate.type) {
    return 0;
  }

  // This score is our Milestone 2 baseline: text overlap, location overlap, and a simple photo color comparison.
  const baseTokens = baseItem.searchKeywords?.length
    ? baseItem.searchKeywords
    : tokenize(`${baseItem.title} ${baseItem.description} ${baseItem.location}`);
  const candidateTokens = candidate.searchKeywords?.length
    ? candidate.searchKeywords
    : tokenize(`${candidate.title} ${candidate.description} ${candidate.location}`);

  const textScore = jaccardScore(baseTokens, candidateTokens);
  const locationScore = jaccardScore(tokenize(baseItem.location), tokenize(candidate.location));
  const imageScore = imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature);
  const statusBoost = (baseItem.status || "open") === "open" && (candidate.status || "open") === "open" ? 8 : 0;

  return Math.min(99, Math.round(textScore * 42 + locationScore * 20 + imageScore * 30 + statusBoost));
}

function tokenize(value) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    )
  ];
}

function jaccardScore(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  const union = new Set([...left, ...right]);

  if (union.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token));
  return intersection.length / union.size;
}

function imageSimilarityScore(left, right) {
  if (!left || !right) {
    return 0;
  }

  const distance = Math.sqrt(
    (left.averageColor.r - right.averageColor.r) ** 2 +
      (left.averageColor.g - right.averageColor.g) ** 2 +
      (left.averageColor.b - right.averageColor.b) ** 2
  );

  return Math.max(0, 1 - distance / 441);
}
