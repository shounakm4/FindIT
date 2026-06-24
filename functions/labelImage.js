import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-2.5-flash";

const PROMPT = [
  "You are labelling a photo for a campus lost-and-found app.",
  "List the details that help tell one item apart from another:",
  "the item category (for example wallet, laptop, water bottle, backpack, keys, earbuds),",
  "its main colours, and any brand or text you can read on it.",
  "Use short lowercase labels and give each one a confidence between 0 and 1."
].join(" ");

const LABEL_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      confidence: { type: Type.NUMBER }
    },
    required: ["text", "confidence"]
  }
};

export async function labelImage({ apiKey, imageBase64, mimeType }) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: PROMPT },
      { inlineData: { mimeType, data: imageBase64 } }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: LABEL_SCHEMA
    }
  });

  return cleanLabels(response.text);
}

function cleanLabels(rawText) {
  let parsed;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((label) => ({
      text: String(label.text || "").trim().toLowerCase(),
      confidence: clampConfidence(Number(label.confidence))
    }))
    .filter((label) => label.text.length > 0)
    .slice(0, 12);
}

function clampConfidence(value) {
  if (Number.isNaN(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}
