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
  powerbank: "powerbank",
  powerbanks: "powerbank",
  purse: "wallet",
  rucksack: "bag",
  spectacle: "glasses",
  spectacles: "glasses",
  university: "nus"
};

const CANONICAL_PHRASES = [
  { pattern: /\bpower\s*banks?\b/g, replacement: "powerbank" },
  { pattern: /\bportable\s+chargers?\b/g, replacement: "powerbank" },
  { pattern: /\bbattery\s+banks?\b/g, replacement: "powerbank" },
  { pattern: /\bidentity\s+cards?\b/g, replacement: "card" },
  { pattern: /\bstudent\s+cards?\b/g, replacement: "card" },
  { pattern: /\baccess\s+passes?\b/g, replacement: "pass" }
];

const CATEGORY_TERMS = {
  wallet: ["wallet", "billfold", "purse"],
  phone: ["phone", "iphone", "mobile", "cellphone", "handphone"],
  powerbank: ["powerbank", "power bank", "portable charger", "battery bank"],
  laptop: ["laptop", "macbook", "notebook"],
  headphones: ["earbuds", "earbud", "airpods", "airpod", "earphones", "earphone", "buds", "headphones"],
  bag: ["bag", "backpack", "rucksack", "tote", "pouch"],
  bottle: ["bottle", "flask", "tumbler"],
  card: ["card", "pass", "id"],
  keys: ["keys", "key"],
  glasses: ["glasses", "spectacles", "eyeglasses", "sunglasses"],
  umbrella: ["umbrella"],
  charger: ["charger", "adapter"]
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
    const matchesCategory = filters.category === "all" || (item.matchAttributes?.category || "") === filters.category;
    const matchesLocation = filters.location === "all" || item.location === filters.location;
    const searchable = `${item.title} ${item.description} ${item.location} ${item.userName}`.toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

    return matchesType && matchesStatus && matchesCategory && matchesLocation && matchesQuery;
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

export function findAlertsForUser(items, user) {
  if (!user) {
    return [];
  }

  const myOpenItems = items.filter(
    (item) => item.userId === user.id && (item.status || "open") === "open"
  );
  const alerts = new Map();

  myOpenItems.forEach((myItem) => {
    findMatchSuggestions(items, myItem).forEach((suggestion) => {
      if (suggestion.score < 55) {
        return;
      }

      const existing = alerts.get(suggestion.item.id);

      if (!existing || suggestion.score > existing.score) {
        alerts.set(suggestion.item.id, { ...suggestion, sourceItem: myItem });
      }
    });
  });

  return [...alerts.values()].sort((a, b) => b.score - a.score);
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
    category: firstMatchingGroup(text, tokens, CATEGORY_TERMS),
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

  const baseAttributes = resolveMatchAttributes(baseItem);
  const candidateAttributes = resolveMatchAttributes(candidate);
  const textScore = weightedTextScore(baseItem, candidate);
  const attributeScore = matchAttributeScore(baseAttributes, candidateAttributes);
  const locationScore = jaccardScore(tokenize(baseItem.location), tokenize(candidate.location));
  const labelScore = labelSimilarityScore(baseItem.imageLabels, candidate.imageLabels);
  const imageScore = imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature);
  const timeScore = timeProximityScore(baseItem.createdAt, candidate.createdAt);
  const categoriesConflict =
    baseAttributes.category &&
    candidateAttributes.category &&
    baseAttributes.category !== candidateAttributes.category;

  // Labels still lead, but exact category, description, and location should be enough
  // to lift a strong same-object report above incidental dark-object similarities.
  const score = Math.min(
    99,
    Math.round(
      labelScore * 42 +
        imageScore * 20 +
        textScore * 20 +
        attributeScore * 25 +
        locationScore * 12 +
        timeScore * 3
    )
  );

  return categoriesConflict ? Math.min(score, 44) : score;
}

export function getMatchReasons(baseItem, candidate) {
  if (!baseItem || !candidate || baseItem.type === candidate.type) {
    return [];
  }

  const reasons = [];
  const baseAttributes = resolveMatchAttributes(baseItem);
  const candidateAttributes = resolveMatchAttributes(candidate);

  if (labelSimilarityScore(baseItem.imageLabels, candidate.imageLabels) >= 0.3) {
    reasons.push("similar image labels");
  }

  if (imageSimilarityScore(baseItem.imageSignature, candidate.imageSignature) >= 0.85) {
    reasons.push("similar photo color");
  }

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

  if (timeProximityScore(baseItem.createdAt, candidate.createdAt) >= 0.65) {
    reasons.push("close report time");
  }

  return reasons.slice(0, 4);
}

function tokenize(value) {
  const text = canonicalizeText(value);

  return [
    ...new Set(
      text
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token && (token.length > 2 || token === "id") && !STOP_WORDS.has(token))
    )
  ];
}

function canonicalizeText(value) {
  let text = String(value || "").toLowerCase();

  CANONICAL_PHRASES.forEach(({ pattern, replacement }) => {
    text = text.replace(pattern, replacement);
  });

  return text.replace(/\b(com|lt|sde|as|utown|pgp)\s+([0-9]+[a-z]?)\b/g, "$1$2");
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
  return canonicalizeText(`${report.title || ""} ${report.description || ""} ${report.location || ""}`);
}

function reportTokens(report) {
  return tokenize(reportText(report));
}

function resolveMatchAttributes(report) {
  const attributes = report.matchAttributes || {};
  const inferredAttributes = buildMatchAttributes(report);
  const labelAttributes = buildMatchAttributes({
    title: labelText(report.imageLabels),
    description: "",
    location: ""
  });

  return {
    category: attributes.category || inferredAttributes.category || labelAttributes.category || "",
    colors: mergeValues(attributes.colors, inferredAttributes.colors, labelAttributes.colors),
    materials: mergeValues(attributes.materials, inferredAttributes.materials, labelAttributes.materials),
    brands: mergeValues(attributes.brands, inferredAttributes.brands, labelAttributes.brands),
    identifiers: mergeValues(attributes.identifiers, inferredAttributes.identifiers, labelAttributes.identifiers)
  };
}

function labelText(labels = []) {
  return labels.map((label) => label.text || label.description || "").join(" ");
}

function mergeValues(...valueGroups) {
  return [...new Set(valueGroups.flatMap((values) => (Array.isArray(values) ? values : [])))];
}

function firstMatchingGroup(text, tokens, groups) {
  return (
    Object.entries(groups).find(([, terms]) =>
      terms.some((term) => (term.includes(" ") ? text.includes(term) : tokens.includes(normalizeToken(term))))
    )?.[0] || ""
  );
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
    const text = String(label.text || label.description || "").trim();
    const confidenceValue = Number(label.confidence || label.score || 0.5);
    const confidence = Number.isFinite(confidenceValue) ? confidenceValue : 0.5;

    tokenize(text).forEach((token) => {
      map.set(token, Math.max(map.get(token) || 0, confidence));
    });

    return map;
  }, new Map());
}

function imageSimilarityScore(left, right) {
  if (!left || !right || !left.averageColor || !right.averageColor) {
    return 0;
  }

  const distance = Math.sqrt(
    (left.averageColor.r - right.averageColor.r) ** 2 +
      (left.averageColor.g - right.averageColor.g) ** 2 +
      (left.averageColor.b - right.averageColor.b) ** 2
  );

  return Math.min(0.8, Math.max(0, 1 - distance / 441));
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
