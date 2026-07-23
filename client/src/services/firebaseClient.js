import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "appId"];
const missingConfigKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

export const isFirebaseConfigured = missingConfigKeys.length === 0;

let app;
let auth;
let db;
let functionsClient;
let storage;

const CHAT_CLAIM_STATUSES = ["sent", "reviewing", "accepted"];

function ensureFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error(
      `Firebase is not configured yet. Missing: ${missingConfigKeys.join(", ")}. Check the .env values.`
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functionsClient = getFunctions(app);
    storage = getStorage(app);
  }

  return { auth, db, functionsClient, storage };
}

function normalizeTelegramContact(contact = "") {
  const trimmed = contact.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

async function ensureProfile(user) {
  const { db } = ensureFirebase();
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : null;

  // self-heal: a signed-in account whose profile doc went missing (or is incomplete) gets a basic one rebuilt
  if (!existing || !existing.email) {
    const profile = {
      name: existing?.name || user.displayName || user.email.split("@")[0],
      email: user.email,
      emailVerified: user.emailVerified,
      telegramContact: existing?.telegramContact || "",
      createdAt: existing?.createdAt || serverTimestamp()
    };
    await setDoc(ref, profile, { merge: true });
    return { ...existing, ...profile };
  }

  return existing;
}

async function publicUser(user) {
  const profile = await ensureProfile(user);

  return {
    id: user.uid,
    name: profile.name || user.displayName || user.email.split("@")[0],
    email: user.email,
    emailVerified: user.emailVerified,
    telegramContact: profile.telegramContact || ""
  };
}

function isNusEmail(email) {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@u.nus.edu") || normalized.endsWith("@nus.edu.sg");
}

function mapFirebaseError(error) {
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Please use a password with at least 6 characters."
  };

  return messages[error.code] || error.message || "Firebase request failed.";
}

function normalizeClaimStatus(status) {
  return ["sent", "reviewing", "accepted", "rejected"].includes(status) ? status : "sent";
}

function normalizeFirestoreDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const timestampDate = typeof value.toDate === "function" ? value.toDate() : null;
  const seconds = Number(value.seconds ?? value._seconds);
  const date = timestampDate || (Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(value));

  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

export function subscribeToAuth(callback, onError, options = {}) {
  try {
    const { auth } = ensureFirebase();
    return onAuthStateChanged(
      auth,
      (user) => {
        if (user && !user.emailVerified) {
          if (options.shouldIgnoreUnverifiedUser?.(user)) {
            callback(null);
            return;
          }

          onError("Please verify your NUS email before using FindIT.");
          signOut(auth);
          callback(null);
          return;
        }

        if (!user) {
          callback(null);
          return;
        }

        publicUser(user)
          .then(callback)
          .catch(() => {
            // profile could not be loaded or rebuilt (e.g. the account no longer exists) — return to the login screen
            signOut(auth);
            callback(null);
          });
      },
      (error) => onError(mapFirebaseError(error))
    );
  } catch (error) {
    onError(error.message);
    callback(null);
    return () => {};
  }
}

export async function registerUser({ name, email, password, telegramContact }) {
  if (!isNusEmail(email)) {
    throw new Error("Please register with an NUS email address.");
  }

  const normalizedTelegramContact = normalizeTelegramContact(telegramContact);

  if (!normalizedTelegramContact) {
    throw new Error("Please add your Telegram contact.");
  }

  try {
    const { auth, db } = ensureFirebase();
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    await setDoc(doc(db, "users", credential.user.uid), {
      name: name.trim(),
      email: credential.user.email,
      emailVerified: false,
      telegramContact: normalizedTelegramContact,
      createdAt: serverTimestamp()
    });
    await sendEmailVerification(credential.user);

    await signOut(auth);

    return {
      email: credential.user.email,
      verificationSent: true
    };
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function loginUser({ email, password }) {
  try {
    const { auth, db } = ensureFirebase();
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
      await signOut(auth);
      throw new Error("Please verify your NUS email. We sent another verification link to your inbox.");
    }

    await setDoc(doc(db, "users", credential.user.uid), { emailVerified: true }, { merge: true });

    return publicUser(credential.user);
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function resendVerificationEmail({ email, password }) {
  if (!isNusEmail(email)) {
    throw new Error("Please use your NUS email address.");
  }

  try {
    const { auth } = ensureFirebase();
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

    if (credential.user.emailVerified) {
      await signOut(auth);
      return {
        alreadyVerified: true,
        email: credential.user.email
      };
    }

    await sendEmailVerification(credential.user);
    await signOut(auth);

    return {
      email: credential.user.email,
      verificationSent: true
    };
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function logoutUser() {
  const { auth } = ensureFirebase();
  await signOut(auth);
}

function dataUrlToBase64(imageDataUrl) {
  if (typeof imageDataUrl !== "string") {
    return "";
  }

  return imageDataUrl.replace(/^data:[^;]+;base64,/, "");
}

export async function analyzeImageLabels({ imageDataUrl, imageSignature, description, userId }) {
  try {
    if (!imageDataUrl) {
      return null;
    }

    const { functionsClient } = ensureFirebase();
    const analyzeImage = httpsCallable(functionsClient, "analyzeImage");
    const result = await analyzeImage({
      base64Image: dataUrlToBase64(imageDataUrl),
      userId,
      imageSignature,
      description
    });
    const labels = result.data?.labels;

    return {
      labels: Array.isArray(labels) ? labels : [],
      summary: typeof result.data?.summary === "string" ? result.data.summary : "",
      provider: result.data?.provider || "vision",
      model: result.data?.model || null
    };
  } catch (error) {
    console.warn("Unable to analyze image.", error);
    return null;
  }
}

export async function fetchItems() {
  const { db } = ensureFirebase();
  const snapshot = await getDocs(query(collection(db, "items"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((itemDoc) => {
    const item = itemDoc.data();
    return {
      id: itemDoc.id,
      ...item,
      createdAt: normalizeFirestoreDate(item.createdAt)
    };
  });
}

export function subscribeToUserAlerts({ currentUser, onAlerts, onError }) {
  try {
    const { db } = ensureFirebase();
    const alertsQuery = query(collection(db, "alerts"), where("recipientId", "==", currentUser.id));

    return onSnapshot(
      alertsQuery,
      (snapshot) => {
	        const alerts = snapshot.docs
	          .map((alertDoc) => {
	            const alert = alertDoc.data();

	            return {
	              id: alertDoc.id,
	              ...alert,
	              createdAt: normalizeFirestoreDate(alert.createdAt)
	            };
	          })
	          .filter((alert) => alert.status !== "dismissed")
	          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        onAlerts(alerts);
      },
      (error) => onError(error.message || "Unable to load alerts.")
    );
  } catch (error) {
    onError(error.message || "Unable to load alerts.");
    onAlerts([]);
    return () => {};
	  }
}

export async function dismissUserAlert({ alert, currentUser }) {
  if (!alert?.id) {
    return;
  }

  if (alert.recipientId !== currentUser.id) {
    throw new Error("You can only dismiss your own alerts.");
  }

  const { db } = ensureFirebase();

  await updateDoc(doc(db, "alerts", alert.id), {
    dismissedAt: serverTimestamp(),
    status: "dismissed"
  });
}

export async function fetchClaims({ currentUser, item }) {
  const { db } = ensureFirebase();
  const claimsRef = collection(db, "items", item.id, "claims");
  const isOwner = item.userId === currentUser.id;
  const claimsQuery = isOwner
    ? query(claimsRef, orderBy("createdAt", "desc"))
    : query(claimsRef, where("claimantId", "==", currentUser.id));
  const snapshot = await getDocs(claimsQuery);
  const claims = snapshot.docs.map((claimDoc) => {
    const claim = claimDoc.data();
    return {
      id: claimDoc.id,
      ...claim,
      status: normalizeClaimStatus(claim.status),
      createdAt: normalizeFirestoreDate(claim.createdAt)
    };
  });

  return claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchUserClaimSummary({ currentUser, items }) {
  const myLostItems = items.filter((item) => item.userId === currentUser.id && item.type === "lost");
  const claimGroups = await Promise.all(myLostItems.map((item) => fetchClaims({ currentUser, item })));
  const claims = claimGroups.flat();

  return {
    total: claims.length,
    sent: claims.filter((claim) => (claim.status || "sent") === "sent").length,
    reviewing: claims.filter((claim) => claim.status === "reviewing").length,
    accepted: claims.filter((claim) => claim.status === "accepted").length,
    rejected: claims.filter((claim) => claim.status === "rejected").length
  };
}

export async function fetchUserChats({ currentUser, items }) {
  const claimGroups = await Promise.all(
    items.map(async (item) => {
      try {
        const claims = await fetchClaims({ currentUser, item });

        return claims
          .filter((claim) => CHAT_CLAIM_STATUSES.includes(claim.status))
          .map((claim) => ({
            id: `${item.id}:${claim.id}`,
            claim,
            item,
            otherName: claim.itemOwnerId === currentUser.id ? claim.claimantName : item.userName
          }));
      } catch {
        return [];
      }
    })
  );

  return claimGroups.flat();
}

export async function createItemReport({ currentUser, imageFile, report }) {
  if (!imageFile && report.type !== "lost") {
    throw new Error("Please upload an item photo before saving the report.");
  }

  const { db, storage } = ensureFirebase();
  const cachedLabels = Array.isArray(report.imageLabels) ? report.imageLabels : [];
  let imagePath = "";
  let imageUrl = "";

  if (imageFile) {
    const extension = imageFile.name.split(".").pop() || "jpg";
    imagePath = `items/${currentUser.id}/${crypto.randomUUID()}.${extension}`;
    const imageRef = ref(storage, imagePath);
    await uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
    imageUrl = await getDownloadURL(imageRef);
  }

  const item = {
    type: report.type,
    title: report.title.trim(),
    description: report.description.trim(),
    location: report.location.trim(),
    imageUrl,
    imagePath,
    imageSignature: report.imageSignature || null,
    imageLabels: cachedLabels,
    matchAttributes: report.matchAttributes || null,
    searchKeywords: report.searchKeywords || [],
    status: "open",
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    userTelegramContact: currentUser.telegramContact || "",
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "items"), item);
  let labelUpdate = {};

  // if we didn't reuse cached labels, ask the function to analyze the photo and save what it finds
  if (!cachedLabels.length && report.imageDataUrl) {
    const analysis = await analyzeImageLabels({
      imageDataUrl: report.imageDataUrl,
      imageSignature: report.imageSignature,
      description: report.description,
      userId: currentUser.id
    });

    labelUpdate = { imageLabels: analysis?.labels || [] };
    await updateDoc(docRef, labelUpdate);
  }

  return {
    id: docRef.id,
    ...item,
    ...labelUpdate,
    createdAt: new Date().toISOString()
  };
}

export async function createClaim({ item, currentUser, claim }) {
  if (item.userId === currentUser.id) {
    throw new Error("You cannot claim your own report.");
  }

  if (!claim.message.trim()) {
    throw new Error("Please add a message.");
  }

  const { db } = ensureFirebase();
  const userProfile = await getDoc(doc(db, "users", currentUser.id));
  const registeredTelegramContact = normalizeTelegramContact(
    userProfile.data()?.telegramContact || currentUser.telegramContact || ""
  );
  const claimsRef = collection(db, "items", item.id, "claims");
  const existingClaimsQuery = query(claimsRef, where("claimantId", "==", currentUser.id), limit(1));
  const existingClaims = await getDocs(existingClaimsQuery);

  if (!existingClaims.empty) {
    throw new Error("You already sent a claim request for this item.");
  }

  const claimBody = {
    itemId: item.id,
    itemOwnerId: item.userId,
    claimantId: currentUser.id,
    claimantName: currentUser.name,
    claimantEmail: currentUser.email,
    message: claim.message.trim(),
    contact: registeredTelegramContact,
    status: "sent"
  };

  const batch = writeBatch(db);
  const claimRef = doc(db, "items", item.id, "claims", currentUser.id);
  const alertRef = doc(collection(db, "alerts"));
  const createdAt = serverTimestamp();

  batch.set(claimRef, {
    ...claimBody,
    createdAt
  });
  batch.set(alertRef, {
    type: "claim",
    recipientId: item.userId,
    createdBy: currentUser.id,
    itemId: item.id,
    itemTitle: item.title,
    itemType: item.type,
    claimId: claimRef.id,
    claimantId: currentUser.id,
    claimantName: currentUser.name,
    message: claim.message.trim(),
    status: "unread",
    createdAt
  });

  await batch.commit();

  return {
    id: claimRef.id,
    ...claimBody,
    createdAt: new Date().toISOString()
  };
}

export async function updateClaimStatus({ claim, currentUser, item, status }) {
  const validStatuses = ["sent", "reviewing", "accepted", "rejected"];

  if (item.userId !== currentUser.id) {
    throw new Error("Only the reporter can update claim status.");
  }

  if (!validStatuses.includes(status)) {
    throw new Error("Choose a valid claim status.");
  }

  const { db } = ensureFirebase();
  const updates = {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.id
  };

  const claimRef = doc(db, "items", item.id, "claims", claim.id);

  if (status === "rejected") {
    await deleteDoc(claimRef);

    return null;
  }

  await updateDoc(claimRef, updates);

  return {
    ...claim,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser.id
  };
}

export async function resolveItem({ item, currentUser }) {
  if (item.userId !== currentUser.id) {
    throw new Error("Only the reporter can resolve this item.");
  }

  const { db } = ensureFirebase();
  const itemRef = doc(db, "items", item.id);
  const updates = {
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolvedBy: currentUser.id,
    updatedAt: serverTimestamp()
  };

  await updateDoc(itemRef, updates);

  return {
    ...item,
    status: "resolved",
    resolvedAt: new Date().toISOString(),
    resolvedBy: currentUser.id,
    updatedAt: new Date().toISOString()
  };
}

function chatId(itemId, claimId) {
  return `chat_${itemId}_${claimId}`;
}

async function ensureChatConversation({ claim, currentUser, item }) {
  if (!CHAT_CLAIM_STATUSES.includes(claim.status)) {
    throw new Error("Chat is not available for this claim.");
  }

  if (![claim.itemOwnerId, claim.claimantId].includes(currentUser.id)) {
    throw new Error("Only the claimant and report owner can open this chat.");
  }

  const { db } = ensureFirebase();
  const conversationRef = doc(db, "conversations", chatId(item.id, claim.id));
  const conversation = await getDoc(conversationRef);

  if (!conversation.exists()) {
    await setDoc(conversationRef, {
      itemId: item.id,
      claimId: claim.id,
      participantIds: [claim.itemOwnerId, claim.claimantId],
      createdAt: serverTimestamp()
    });
  }

  return conversationRef;
}

export async function sendChatMessage({ claim, currentUser, item, text }) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Please enter a message.");
  }

  const { db } = ensureFirebase();
  const conversationRef = await ensureChatConversation({ claim, currentUser, item });
  const messageRef = doc(collection(conversationRef, "messages"));

  try {
    await setDoc(messageRef, {
      text: trimmedText,
      senderId: currentUser.id,
      createdAt: serverTimestamp()
    });
  } catch {
    throw new Error("Unable to save the message. Please refresh and try again.");
  }
}

export function subscribeToChatMessages({ claim, currentUser, item, onError, onMessages }) {
  let unsubscribe = () => {};
  let cancelled = false;

  ensureChatConversation({ claim, currentUser, item })
    .then((conversationRef) => {
      if (cancelled) {
        return;
      }

      const messagesQuery = query(collection(conversationRef, "messages"), orderBy("createdAt", "asc"));
      unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messages = snapshot.docs.map((messageDoc) => {
            const message = messageDoc.data();

            return {
              id: messageDoc.id,
              ...message,
              text: message.text || "Older message unavailable.",
              createdAt: normalizeFirestoreDate(message.createdAt)
            };
          });

          onMessages(messages);
        },
        (error) => onError(error.message || "Unable to load chat.")
      );
    })
    .catch((error) => {
      onError(error.message || "Unable to open chat.");
      onMessages([]);
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
