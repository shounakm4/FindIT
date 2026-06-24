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
      score: calculateMatchScore(selectedItem, candidate),
      reasons: getMatchReasons(selectedItem, candidate)
    }))
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function findTopMatchForUser(items, user) {
  if (!user) {
    return null;
  }

  const myOpenItems = items.filter(
    (item) => item.userId === user.id && (item.status || "open") === "open"
  );

  let best = null;

  myOpenItems.forEach((myItem) => {
    findMatchSuggestions(items, myItem).forEach((suggestion) => {
      if (!best || suggestion.score > best.score) {
        best = { ...suggestion, sourceItem: myItem };
      }
    });
  });

  return best && best.score >= 55 ? best : null;
}

export function getMatchConfidence(score) {
  if (score >= 70) {
    return "High";
  }

  if (score >= 45) {
    return "Medium";
  }

  return "Low";
}

export function buildSearchKeywords(report) {
  return tokenize(`${report.title} ${report.description} ${report.location}`);
}

export function calculateMatchScore(baseItem, candidate) {
  if (!baseItem || !candidate || baseItem.type === candidate.type) {
    return 0;
  }

  const baseTokens = baseItem.searchKeywords?.length
    ? baseItem.searchKeywords
    : tokenize(`${baseItem.title} ${baseItem.description} ${baseItem.location}`);
  const candidateTokens = candidate.searchKeywords?.length
    ? candidate.searchKeywords
    : tokenize(`${candidate.title} ${candidate.description} ${candidate.location}`);

  const textScore = jaccardScore(baseTokens, candidateTokens);
  const locationScore = jaccardScore(tokenize(baseItem.location), tokenize(candidate.location));
  const labelScore = labelSimilarityScore(baseItem.imageLabels, candidate.imageLabels);
  const imageScore = imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature);
  const timeScore = timeProximityScore(baseItem.createdAt, candidate.createdAt);
  const statusBoost = (baseItem.status || "open") === "open" && (candidate.status || "open") === "open" ? 6 : 0;

  return Math.min(
    99,
    Math.round(textScore * 34 + locationScore * 18 + labelScore * 24 + imageScore * 14 + timeScore * 10 + statusBoost)
  );
}

export function getMatchReasons(baseItem, candidate) {
  const reasons = [];
  const baseTokens = baseItem.searchKeywords?.length
    ? baseItem.searchKeywords
    : tokenize(`${baseItem.title} ${baseItem.description} ${baseItem.location}`);
  const candidateTokens = candidate.searchKeywords?.length
    ? candidate.searchKeywords
    : tokenize(`${candidate.title} ${candidate.description} ${candidate.location}`);

  if (jaccardScore(baseTokens, candidateTokens) >= 0.25) {
    reasons.push("similar description");
  }

  if (jaccardScore(tokenize(baseItem.location), tokenize(candidate.location)) >= 0.35) {
    reasons.push("nearby location");
  }

  if (labelSimilarityScore(baseItem.imageLabels, candidate.imageLabels) >= 0.3) {
    reasons.push("similar image labels");
  }

  if (imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature) >= 0.75) {
    reasons.push("similar photo color");
  }

  if (timeProximityScore(baseItem.createdAt, candidate.createdAt) >= 0.65) {
    reasons.push("close report time");
  }

  return reasons.slice(0, 3);
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

function labelSimilarityScore(leftLabels = [], rightLabels = []) {
  if (!leftLabels.length || !rightLabels.length) {
    return 0;
  }

  const left = weightedLabelMap(leftLabels);
  const right = weightedLabelMap(rightLabels);
  const allLabels = new Set([...left.keys(), ...right.keys()]);
  let overlap = 0;
  let total = 0;

  allLabels.forEach((label) => {
    const leftScore = left.get(label) || 0;
    const rightScore = right.get(label) || 0;
    overlap += Math.min(leftScore, rightScore);
    total += Math.max(leftScore, rightScore);
  });

  return total === 0 ? 0 : overlap / total;
}

function weightedLabelMap(labels) {
  return labels.reduce((map, label) => {
    const text = String(label.text || label.description || "").trim().toLowerCase();

    if (text) {
      map.set(text, Math.max(map.get(text) || 0, Number(label.confidence || label.score || 0.5)));
    }

    return map;
  }, new Map());
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

function timeProximityScore(leftDate, rightDate) {
  if (!leftDate || !rightDate) {
    return 0;
  }

  const left = new Date(leftDate).getTime();
  const right = new Date(rightDate).getTime();

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return 0;
  }

  const hoursApart = Math.abs(left - right) / (1000 * 60 * 60);
  return Math.max(0, 1 - hoursApart / 72);
}
