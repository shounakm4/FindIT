const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const visionApiKey = defineSecret("VISION_API_KEY");
const labelCache = new Map();
const rateLimitWindows = new Map();

const GEMINI_MODEL = "gemini-1.5-flash";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

exports.analyzeImage = onCall(
  {
    region: "us-central1",
    secrets: [geminiApiKey, visionApiKey]
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in before analyzing images.");
      }

      const { base64Image, imageDataUrl, imageSignature, mimeType: requestedMimeType, userId, description = "" } =
        request.data || {};

      if (typeof userId !== "string" || userId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "The image analysis userId must match the signed-in user.");
      }

      enforceRateLimit(userId);

      const imageInput = parseImageInput({ base64Image, imageDataUrl, requestedMimeType });

      if (!imageInput.data) {
        throw new HttpsError("invalid-argument", "Send a base64-encoded image before analyzing.");
      }

      const cacheKey = imageSignatureKey(imageSignature);
      const cachedAnalysis = labelCache.get(cacheKey);

      if (cachedAnalysis) {
        return cachedAnalysis;
      }

      const prompt =
        'You are helping match lost and found items. Analyze this image and the description below. Return ONLY valid JSON with shape {"labels":[{"text": string, "confidence": number}],"summary": string}. Include 5 to 10 labels covering: the item category (e.g. wallet, phone, bag), visible colors, visible brand names, visible materials (leather, plastic, fabric), and any unique identifiers. Confidence must be a number between 0 and 1. Description: ' +
        String(description).slice(0, 1000);

      const geminiAnalysis = await analyzeWithGemini({
        apiKey: geminiApiKey.value()?.trim(),
        imageData: imageInput.data,
        mimeType: imageInput.mimeType,
        prompt
      });

      const analysis =
        geminiAnalysis ||
        (await analyzeWithVisionFallback({
          apiKey: visionApiKey.value()?.trim(),
          imageData: imageInput.data
        })) || {
          labels: [],
          summary: "",
          provider: "none"
        };

      if (cacheKey && analysis.labels.length) {
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
  }
);

async function analyzeWithGemini({ apiKey, imageData, mimeType, prompt }) {
  if (!apiKey) {
    logger.warn("Gemini API key is not configured.");
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageData
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    logger.warn("Gemini image analysis request failed.", { status: response.status });
    return null;
  }

  const result = await response.json();
  const responseText = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = parseJsonText(responseText);
  const labels = normalizeLabels(parsed?.labels || parsed);

  if (!labels.length) {
    logger.warn("Gemini image analysis returned no usable labels.");
    return null;
  }

  return {
    labels,
    summary: typeof parsed?.summary === "string" ? parsed.summary : "",
    provider: "gemini",
    model: GEMINI_MODEL
  };
}

async function analyzeWithVisionFallback({ apiKey, imageData }) {
  if (!apiKey) {
    logger.warn("Vision API key is not configured; skipping fallback analysis.");
    return null;
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: imageData
          },
          features: [{ type: "LABEL_DETECTION", maxResults: 10 }, { type: "TEXT_DETECTION", maxResults: 5 }]
        }
      ]
    })
  });

  if (!response.ok) {
    logger.warn("Vision fallback image analysis request failed.", { status: response.status });
    return null;
  }

  const result = await response.json();
  const visionResponse = result.responses?.[0] || {};
  const labelAnnotations = Array.isArray(visionResponse.labelAnnotations) ? visionResponse.labelAnnotations : [];
  const textAnnotations = Array.isArray(visionResponse.textAnnotations) ? visionResponse.textAnnotations.slice(0, 3) : [];
  const labels = normalizeLabels([
    ...labelAnnotations.map((label) => ({
      text: label.description,
      confidence: label.score
    })),
    ...textAnnotations.map((text) => ({
      text: text.description,
      confidence: 0.85
    }))
  ]);

  return {
    labels,
    summary: textAnnotations[0]?.description || "",
    provider: "vision",
    model: "cloud-vision-label-and-text-detection"
  };
}

function enforceRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = (rateLimitWindows.get(userId) || []).filter((timestamp) => timestamp > windowStart);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new HttpsError("resource-exhausted", "Please wait a minute before analyzing more images.");
  }

  recentRequests.push(now);
  rateLimitWindows.set(userId, recentRequests);
}

function parseImageInput({ base64Image, imageDataUrl, requestedMimeType }) {
  const imageValue = typeof base64Image === "string" && base64Image.trim() ? base64Image : imageDataUrl;
  const dataUrlMatch = typeof imageValue === "string" ? imageValue.match(/^data:([^;]+);base64,(.*)$/) : null;
  const mimeType = dataUrlMatch?.[1] || requestedMimeType || "image/jpeg";
  const data = (dataUrlMatch?.[2] || imageValue || "").replace(/\s/g, "");

  return {
    data,
    mimeType
  };
}

function parseJsonText(text) {
  try {
    const jsonText = String(text || "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(jsonText);
  } catch (error) {
    logger.warn("Unable to parse image analysis JSON.", error);
    return null;
  }
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) {
    return [];
  }

  const dedupedLabels = new Map();

  for (const label of labels) {
    const text = String(label?.text || label?.description || "").trim();
    const confidence = Number(label?.confidence ?? label?.score ?? 0);

    if (!text || !Number.isFinite(confidence)) {
      continue;
    }

    const key = text.toLowerCase();
    const normalizedLabel = {
      text,
      confidence: Math.max(0, Math.min(1, confidence))
    };
    const existingLabel = dedupedLabels.get(key);

    if (!existingLabel || normalizedLabel.confidence > existingLabel.confidence) {
      dedupedLabels.set(key, normalizedLabel);
    }
  }

  return Array.from(dedupedLabels.values()).slice(0, 10);
}

function imageSignatureKey(signature) {
  if (!signature) {
    return "";
  }

  if (typeof signature.perceptualHash === "string" && signature.perceptualHash) {
    return signature.perceptualHash;
  }

  if (Array.isArray(signature.colorGrid)) {
    return signature.colorGrid.map((pixel) => (Array.isArray(pixel) ? pixel.join("-") : String(pixel))).join(".");
  }

  if (signature.averageColor) {
    const { r, g, b } = signature.averageColor;
    return `${r}-${g}-${b}`;
  }

  return "";
}
