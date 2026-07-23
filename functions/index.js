const crypto = require("crypto");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const vision = require("@google-cloud/vision");
const { getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

const client = new vision.ImageAnnotatorClient();
const labelCache = new Map();
const rateLimitWindows = new Map();
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

if (!getApps().length) {
  initializeApp();
}

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
    logger.info(`Vision returned ${analysis.labels.length} labels: ${JSON.stringify(analysis.labels)}`);

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

exports.emailNewClaim = onDocumentCreated(
  { document: "alerts/{alertId}", region: "asia-southeast1", secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const alert = event.data?.data();

    if (!alert || alert.type !== "claim") {
      return;
    }

    await sendNotificationEmail({
      eventId: event.id,
      recipientId: alert.recipientId,
      subject: `New claim for ${alert.itemTitle || "your item"}`,
      text: `${alert.claimantName || "A FindIT user"} sent a claim request for ${alert.itemTitle || "your item"}.\n\nOpen FindIT to review it: https://nusfindit.web.app`
    });
  }
);

exports.emailClaimStatusChange = onDocumentUpdated(
  { document: "items/{itemId}/claims/{claimId}", region: "asia-southeast1", secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const before = event.data?.before.data();
    const claim = event.data?.after.data();

    if (!claim || claim.status === before?.status) {
      return;
    }

    const item = await getItem(event.params.itemId);
    const itemTitle = item?.title || "the item";

    await sendNotificationEmail({
      eventId: event.id,
      recipientId: claim.claimantId,
      subject: `Your claim is now ${claim.status}`,
      text: `Your claim for ${itemTitle} is now marked as ${claim.status}.\n\nOpen FindIT for the latest details: https://nusfindit.web.app`
    });
  }
);

exports.emailClaimRejection = onDocumentDeleted(
  { document: "items/{itemId}/claims/{claimId}", region: "asia-southeast1", secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const claim = event.data?.data();

    if (!claim?.claimantId) {
      return;
    }

    const item = await getItem(event.params.itemId);
    const itemTitle = item?.title || "the item";

    await sendNotificationEmail({
      eventId: event.id,
      recipientId: claim.claimantId,
      subject: "Your claim was not accepted",
      text: `Your claim for ${itemTitle} was not accepted. You can keep browsing FindIT for another match.\n\nOpen FindIT: https://nusfindit.web.app`
    });
  }
);

exports.emailHighConfidenceMatch = onDocumentCreated(
  { document: "items/{itemId}", region: "asia-southeast1", secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const createdItem = event.data?.data();

    if (!createdItem?.userId || (createdItem.status || "open") !== "open") {
      return;
    }

    const oppositeType = createdItem.type === "lost" ? "found" : "lost";
    const candidatesSnapshot = await admin
      .firestore()
      .collection("items")
      .where("type", "==", oppositeType)
      .where("status", "==", "open")
      .get();
    const matching = await import("./matching.mjs");
    const item = normalizeFirestoreItem({ id: event.params.itemId, ...createdItem });
    const candidates = candidatesSnapshot.docs
      .map((candidate) => normalizeFirestoreItem({ id: candidate.id, ...candidate.data() }))
      .filter((candidate) => candidate.userId !== item.userId);
    const highConfidenceMatches = matching
      .findMatchSuggestions([item, ...candidates], item)
      .filter((match) => match.score >= matching.HIGH_CONFIDENCE_MATCH_THRESHOLD);

    await Promise.all(
      highConfidenceMatches.map((match) => {
        const lostItem = item.type === "lost" ? item : match.item;
        const foundItem = item.type === "found" ? item : match.item;

        return sendNotificationEmail({
          eventId: `match-${lostItem.id}-${foundItem.id}`,
          recipientId: lostItem.userId,
          subject: `Strong match found for ${lostItem.title || "your lost item"}`,
          text: `We found a possible match for ${lostItem.title || "your lost item"} with ${match.score}% confidence.\n\nOpen FindIT to review it: https://nusfindit.web.app`
        });
      })
    );
  }
);

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

async function getItem(itemId) {
  const snapshot = await getFirestore().collection("items").doc(itemId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function sendNotificationEmail({ eventId, recipientId, subject, text }) {
  if (!recipientId) {
    logger.warn("Skipping notification email without a recipient.", { eventId });
    return;
  }

  const db = getFirestore();
  const deliveryRef = db.collection("emailNotifications").doc(eventId);
  const reserved = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(deliveryRef);

    if (existing.exists) {
      return false;
    }

    transaction.create(deliveryRef, {
      recipientId,
      subject,
      status: "sending",
      createdAt: FieldValue.serverTimestamp()
    });
    return true;
  });

  if (!reserved) {
    logger.info("Notification email already handled.", { eventId });
    return;
  }

  const recipient = await db.collection("users").doc(recipientId).get();
  const email = recipient.data()?.email;

  if (!isEmailAddress(email)) {
    await deliveryRef.update({
      status: "skipped",
      updatedAt: FieldValue.serverTimestamp()
    });
    logger.warn("Skipping notification email for a user without a valid email.", { eventId, recipientId });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "notifications.findit@gmail.com",
        pass: GMAIL_APP_PASSWORD.value()
      }
    });
    const result = await transporter.sendMail({
      from: "FindIT <notifications.findit@gmail.com>",
      to: email,
      subject,
      text
    });

    await deliveryRef.update({
      status: "sent",
      messageId: result.messageId || null,
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    await deliveryRef.update({
      status: "failed",
      error: error.message || "Unable to send notification email.",
      updatedAt: FieldValue.serverTimestamp()
    });
    logger.error("Unable to send notification email.", { eventId, error });
    throw error;
  }
}

function isEmailAddress(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeFirestoreItem(item) {
  const createdAt = item.createdAt?.toDate?.() || item.createdAt;

  return {
    ...item,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt
  };
}
