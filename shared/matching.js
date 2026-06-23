const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "are",
  "but",
  "for",
  "has",
  "have",
  "inside",
  "into",
  "its",
  "one",
  "was",
  "were",
  "with",
  "this",
  "that",
  "item",
  "lost",
  "found",
  "from",
  "near",
  "level",
  "floor",
  "around",
  "beside",
  "between",
  "outside"
]);

const CANONICAL_TOKENS = {
  airpod: "earbuds",
  airpods: "earbuds",
  backpack: "bag",
  billfold: "wallet",
  buds: "earbuds",
  cellphone: "phone",
  dark: "black",
  earbud: "earbuds",
  earphone: "earbuds",
  earphones: "earbuds",
  eyeglass: "glasses",
  eyeglasses: "glasses",
  gray: "grey",
  handphone: "phone",
  headphones: "headphone",
  id: "card",
  identity: "card",
  iphone: "phone",
  laptop: "laptop",
  macbook: "laptop",
  mobile: "phone",
  navy: "blue",
  pass: "card",
  purse: "wallet",
  rucksack: "bag",
  spectacle: "glasses",
  spectacles: "glasses",
  university: "nus"
};

const CATEGORY_TERMS = {
  wallet: ["wallet", "billfold", "purse"],
  phone: ["phone", "iphone", "mobile", "cellphone", "handphone"],
  laptop: ["laptop", "macbook", "notebook"],
  earbuds: ["earbuds", "earbud", "airpods", "airpod", "earphones", "earphone", "buds"],
  bag: ["bag", "backpack", "rucksack", "tote", "pouch"],
  bottle: ["bottle", "flask", "tumbler"],
  card: ["card", "pass", "id"],
  keys: ["keys", "key"],
  glasses: ["glasses", "spectacles", "eyeglasses", "sunglasses"],
  umbrella: ["umbrella"],
  charger: ["charger", "adapter", "cable"]
};

const COLOR_TERMS = {
  black: ["black", "dark", "charcoal"],
  blue: ["blue", "navy", "teal"],
  brown: ["brown", "tan", "beige"],
  gold: ["gold", "golden"],
  green: ["green"],
  grey: ["grey", "gray", "silver"],
  orange: ["orange"],
  pink: ["pink"],
  purple: ["purple", "violet"],
  red: ["red", "maroon"],
  white: ["white", "cream"],
  yellow: ["yellow"]
};

const MATERIAL_TERMS = {
  fabric: ["fabric", "cloth", "canvas"],
  leather: ["leather"],
  metal: ["metal", "steel", "aluminium", "aluminum"],
  plastic: ["plastic"],
  rubber: ["rubber"],
  silicone: ["silicone"]
};

const BRAND_TERMS = {
  adidas: ["adidas"],
  anker: ["anker"],
  apple: ["apple", "iphone", "airpods", "airpod", "macbook"],
  asus: ["asus"],
  casio: ["casio"],
  dell: ["dell"],
  "hydro flask": ["hydro flask", "hydroflask"],
  kanken: ["kanken"],
  lenovo: ["lenovo"],
  nike: ["nike"],
  samsung: ["samsung"],
  sony: ["sony"],
  uniqlo: ["uniqlo"]
};

const IDENTIFIER_PATTERNS = [
  { label: "student card", pattern: /\b(nus|student|matric|university)\s+(card|id)\b|\b(card|id)\s+(holder|with)?\s*(nus|student|matric|university)\b/ },
  { label: "access card", pattern: /\b(access|door|staff)\s+(card|pass)\b|\b(card|pass)\s+(for\s+)?(access|door|staff)\b/ },
  { label: "ezlink card", pattern: /\b(ezlink|ez-link|concession)\s+card\b/ },
  { label: "bank card", pattern: /\b(bank|debit|credit|atm)\s+card\b/ },
  { label: "passport", pattern: /\bpassport\b/ },
  { label: "driver license", pattern: /\b(driver|driving)\s+licen[cs]e\b/ }
];

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

export function getMatchConfidence(score) {
  if (score >= 65) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

export function buildSearchKeywords(report) {
  return reportTokens(report);
}

export function buildMatchAttributes(report) {
  const text = reportText(report);
  const tokens = reportTokens(report);

  return {
    category: firstMatchingGroup(tokens, CATEGORY_TERMS),
    colors: matchingGroups(text, tokens, COLOR_TERMS),
    materials: matchingGroups(text, tokens, MATERIAL_TERMS),
    brands: matchingGroups(text, tokens, BRAND_TERMS),
    identifiers: IDENTIFIER_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
  };
}

export function calculateMatchScore(baseItem, candidate) {
  if (!baseItem || !candidate || baseItem.type === candidate.type) {
    return 0;
  }

  const textScore = weightedTextScore(baseItem, candidate);
  const attributeScore = matchAttributeScore(resolveMatchAttributes(baseItem), resolveMatchAttributes(candidate));
  const locationScore = jaccardScore(tokenize(baseItem.location), tokenize(candidate.location));
  const labelScore = labelSimilarityScore(baseItem.imageLabels, candidate.imageLabels);
  const imageScore = imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature);
  const timeScore = timeProximityScore(baseItem.createdAt, candidate.createdAt);
  const statusBoost = (baseItem.status || "open") === "open" && (candidate.status || "open") === "open" ? 3 : 0;

  return Math.min(
    99,
    Math.round(
      textScore * 32 +
        attributeScore * 28 +
        locationScore * 15 +
        labelScore * 12 +
        imageScore * 5 +
        timeScore * 5 +
        statusBoost
    )
  );
}

export function getMatchReasons(baseItem, candidate) {
  if (!baseItem || !candidate || baseItem.type === candidate.type) {
    return [];
  }

  const reasons = [];
  const baseAttributes = resolveMatchAttributes(baseItem);
  const candidateAttributes = resolveMatchAttributes(candidate);

  if (baseAttributes.category && baseAttributes.category === candidateAttributes.category) {
    reasons.push(`same category: ${baseAttributes.category}`);
  }

  const sharedColors = sharedValues(baseAttributes.colors, candidateAttributes.colors);
  if (sharedColors.length) {
    reasons.push(`matching color: ${sharedColors.join(", ")}`);
  }

  const sharedIdentifiers = sharedValues(baseAttributes.identifiers, candidateAttributes.identifiers);
  if (sharedIdentifiers.length) {
    reasons.push(`shared detail: ${sharedIdentifiers[0]}`);
  }

  const sharedBrands = sharedValues(baseAttributes.brands, candidateAttributes.brands);
  if (sharedBrands.length) {
    reasons.push(`matching brand: ${sharedBrands[0]}`);
  }

  if (weightedTextScore(baseItem, candidate) >= 0.25) {
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
        .map(normalizeToken)
        .filter((token) => token && (token.length > 2 || token === "id") && !STOP_WORDS.has(token))
    )
  ];
}

function normalizeToken(token) {
  const normalized = token.toLowerCase();

  if (CANONICAL_TOKENS[normalized]) {
    return CANONICAL_TOKENS[normalized];
  }

  if (normalized.endsWith("ies") && normalized.length > 4) {
    const singular = `${normalized.slice(0, -3)}y`;
    return CANONICAL_TOKENS[singular] || singular;
  }

  if (normalized.endsWith("es") && normalized.length > 4) {
    const singular = normalized.slice(0, -2);
    return CANONICAL_TOKENS[singular] || singular;
  }

  if (normalized.endsWith("s") && normalized.length > 4) {
    const singular = normalized.slice(0, -1);
    return CANONICAL_TOKENS[singular] || singular;
  }

  return normalized;
}

function reportText(report) {
  return `${report.title || ""} ${report.description || ""} ${report.location || ""}`.toLowerCase();
}

function reportTokens(report) {
  return tokenize(reportText(report));
}

function resolveMatchAttributes(report) {
  const attributes = report.matchAttributes || buildMatchAttributes(report);

  return {
    category: attributes.category || "",
    colors: attributes.colors || [],
    materials: attributes.materials || [],
    brands: attributes.brands || [],
    identifiers: attributes.identifiers || []
  };
}

function firstMatchingGroup(tokens, groups) {
  return Object.entries(groups).find(([, terms]) => terms.some((term) => tokens.includes(normalizeToken(term))))?.[0] || "";
}

function matchingGroups(text, tokens, groups) {
  return Object.entries(groups)
    .filter(([, terms]) =>
      terms.some((term) => (term.includes(" ") ? text.includes(term) : tokens.includes(normalizeToken(term))))
    )
    .map(([label]) => label);
}

function weightedTextScore(baseItem, candidate) {
  const fields = [
    { key: "title", weight: 0.35 },
    { key: "description", weight: 0.45 },
    { key: "location", weight: 0.1 }
  ];
  let weightedScore = 0;
  let totalWeight = 0;

  fields.forEach(({ key, weight }) => {
    const left = tokenize(baseItem[key] || "");
    const right = tokenize(candidate[key] || "");

    if (left.length || right.length) {
      weightedScore += jaccardScore(left, right) * weight;
      totalWeight += weight;
    }
  });

  const combinedScore = jaccardScore(
    baseItem.searchKeywords?.length ? baseItem.searchKeywords : reportTokens(baseItem),
    candidate.searchKeywords?.length ? candidate.searchKeywords : reportTokens(candidate)
  );

  weightedScore += combinedScore * 0.1;
  totalWeight += 0.1;

  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
}

function matchAttributeScore(left, right) {
  const scoringFields = [
    {
      key: "category",
      weight: 0.34,
      score: () => (left.category && right.category && left.category === right.category ? 1 : 0)
    },
    { key: "colors", weight: 0.16, score: () => jaccardScore(left.colors, right.colors) },
    { key: "materials", weight: 0.12, score: () => jaccardScore(left.materials, right.materials) },
    { key: "brands", weight: 0.16, score: () => jaccardScore(left.brands, right.brands) },
    { key: "identifiers", weight: 0.22, score: () => jaccardScore(left.identifiers, right.identifiers) }
  ];
  let weightedScore = 0;
  let totalWeight = 0;

  scoringFields.forEach(({ key, weight, score }) => {
    const leftValue = left[key];
    const rightValue = right[key];
    const hasSignal = Array.isArray(leftValue)
      ? leftValue.length || rightValue.length
      : Boolean(leftValue || rightValue);

    if (hasSignal) {
      weightedScore += score() * weight;
      totalWeight += weight;
    }
  });

  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
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

function sharedValues(leftValues = [], rightValues = []) {
  const right = new Set(rightValues);
  return leftValues.filter((value) => right.has(value));
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
