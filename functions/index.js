const crypto = require("crypto");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient();
const labelCache = new Map();
const rateLimitWindows = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Vision hands these back for almost any object, so they make unrelated items look alike. Drop them.
const GENERIC_LABELS = new Set([
  "electronic device",
  "gadget",
  "technology",
  "product",
  "communication device",
  "portable communications device",
  "telephony",
  "electronics",
  "peripheral",
  "output device",
  "input device",
  "office equipment",
  "material property",
  "font",
  "multimedia",
  "everyday carry",
  "still life photography",
  "automotive design"
]);

exports.analyzeImage = onCall({ region: "us-central1" }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in before analyzing images.");
    }

    const { base64Image, imageDataUrl, userId } = request.data || {};

    if (typeof userId !== "string" || userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "The image analysis userId must match the signed-in user.");
    }

    enforceRateLimit(userId);

    const content = parseImageData({ base64Image, imageDataUrl });

    if (!content) {
      throw new HttpsError("invalid-argument", "Send a base64-encoded image before analyzing.");
    }

    // key the cache on the actual image bytes so two different photos never share labels
    const cacheKey = crypto.createHash("sha1").update(content).digest("hex");
    const cached = labelCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const [result] = await client.annotateImage({
      image: { content },
      features: [
        { type: "LABEL_DETECTION", maxResults: 12 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 1 }
      ]
    });

    const analysis = buildAnalysis(result);
    logger.info(`Vision returned ${analysis.labels.length} labels.`, analysis.labels);

    if (analysis.labels.length) {
      labelCache.set(cacheKey, analysis);
    }

    return analysis;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.warn("Unable to analyze image.", error);
    return { labels: [], summary: "", provider: "error" };
  }
});

function buildAnalysis(result) {
  const found = [];

  (result.labelAnnotations || []).forEach((label) => {
    found.push({ text: label.description, confidence: Number(label.score || 0) });
  });

  // logos and any text printed on the item help tell similar items apart, so weight them higher
  (result.logoAnnotations || []).forEach((logo) => {
    found.push({ text: logo.description, confidence: Number(logo.score || 0.95) });
  });

  const readText = result.textAnnotations?.[0]?.description || "";
  readText
    .split(/\s+/)
    .slice(0, 8)
    .forEach((word) => found.push({ text: word, confidence: 0.85 }));

  return {
    labels: normalizeLabels(found),
    summary: readText.replace(/\s+/g, " ").trim().slice(0, 200),
    provider: "vision",
    model: "cloud-vision"
  };
}

function normalizeLabels(labels) {
  const byText = new Map();

  labels.forEach((label) => {
    const text = String(label.text || "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const confidence = Math.max(0, Math.min(1, Number(label.confidence) || 0));

    if (text.length > 2 && !GENERIC_LABELS.has(text)) {
      byText.set(text, Math.max(byText.get(text) || 0, confidence));
    }
  });

  return [...byText].map(([text, confidence]) => ({ text, confidence })).slice(0, 12);
}

function enforceRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitWindows.get(userId) || []).filter((timestamp) => timestamp > windowStart);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new HttpsError("resource-exhausted", "Please wait a minute before analyzing more images.");
  }

  recent.push(now);
  rateLimitWindows.set(userId, recent);
}

function parseImageData({ base64Image, imageDataUrl }) {
  const value = typeof base64Image === "string" && base64Image.trim() ? base64Image : imageDataUrl;
  const match = typeof value === "string" ? value.match(/^data:[^;]+;base64,(.*)$/) : null;
  return (match?.[1] || value || "").replace(/\s/g, "");
}
