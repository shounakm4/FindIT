import { initializeApp } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { labelImage } from "./labelImage.js";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const labelNewItem = onDocumentCreated(
  {
    document: "items/{itemId}",
    secrets: [geminiApiKey]
  },
  async (event) => {
    const snapshot = event.data;
    const itemId = event.params.itemId;

    if (!snapshot) {
      return;
    }

    const item = snapshot.data();

    if (!item.imagePath) {
      logger.info(`Report ${itemId} has no photo to label.`);
      return;
    }

    try {
      const photo = getStorage().bucket().file(item.imagePath);
      const [imageBytes] = await photo.download();
      const [metadata] = await photo.getMetadata();

      const labels = await labelImage({
        apiKey: geminiApiKey.value(),
        imageBase64: imageBytes.toString("base64"),
        mimeType: metadata.contentType || "image/jpeg"
      });

      await snapshot.ref.update({
        imageLabels: labels,
        labeledAt: FieldValue.serverTimestamp()
      });

      logger.info(`Labelled report ${itemId} with ${labels.length} labels.`);
    } catch (error) {
      logger.error(`Could not label report ${itemId}.`, error);
    }
  }
);
