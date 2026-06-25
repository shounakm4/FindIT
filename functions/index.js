const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const labelCache = new Map();
let geminiBackoffUntil = 0;

exports.analyzeImage = onCall(
  {
    region: "us-central1",
    secrets: [geminiApiKey]
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in before analyzing images.");
      }

      const apiKey = geminiApiKey.value()?.trim();

      if (!apiKey) {
        logger.warn("Gemini API key is not configured.");
        return { labels: [] };
      }

      const { imageDataUrl, imageSignature, description = "" } = request.data || {};

      if (typeof imageDataUrl !== "string" || !imageDataUrl.trim()) {
        return { labels: [] };
      }

      const cacheKey = imageSignatureKey(imageSignature);
      const cachedLabels = labelCache.get(cacheKey);

      if (cachedLabels) {
        return { labels: cachedLabels };
      }

      if (Date.now() < geminiBackoffUntil) {
        logger.warn("Skipping Gemini image analysis during rate-limit backoff.");
        return { labels: [] };
      }

      const dataUrlMatch = imageDataUrl.match(/^data:([^;]+);base64,(.*)$/);
      const mimeType = dataUrlMatch?.[1] || "image/jpeg";
      const imageData = dataUrlMatch?.[2] || imageDataUrl;
      const prompt =
        'You are helping match lost and found items. Analyze this image and the description below. Return ONLY a JSON array of label objects with shape [{"text": string, "confidence": number}]. Include 5 to 10 labels covering: the item category (e.g. wallet, phone, bag), visible colors, visible brand names, visible materials (leather, plastic, fabric), and any unique identifiers. Confidence must be a number between 0 and 1. Description: ' +
        String(description);

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: imageData } }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    confidence: { type: "number" }
                  },
                  required: ["text", "confidence"]
                }
              }
            }
          })
        }
      );

      if (!response.ok) {
        logger.warn("Gemini image analysis request failed.", { status: response.status });

        if (response.status === 429) {
          geminiBackoffUntil = Date.now() + 60 * 1000;
        }

        return { labels: [] };
      }

      const result = await response.json();
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonText = responseText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const labels = JSON.parse(jsonText);

      if (!Array.isArray(labels)) {
        return { labels: [] };
      }

      const normalizedLabels = labels
        .map((label) => ({
          text: String(label.text || label.description || "").trim(),
          confidence: Number(label.confidence ?? label.score ?? 0)
        }))
        .filter((label) => label.text && Number.isFinite(label.confidence))
        .map((label) => ({
          ...label,
          confidence: Math.max(0, Math.min(1, label.confidence))
        }));

      if (cacheKey && normalizedLabels.length) {
        labelCache.set(cacheKey, normalizedLabels);
      }

      return { labels: normalizedLabels };
    } catch (error) {
      logger.warn("Unable to analyze image with Gemini.", error);
      return { labels: [] };
    }
  }
);

function imageSignatureKey(signature) {
  if (!signature || !signature.averageColor) {
    return "";
  }

  const { r, g, b } = signature.averageColor;
  return `${r}-${g}-${b}`;
}
