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
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
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
let storage;

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
    storage = getStorage(app);
  }

  return { auth, db, storage };
}

function publicUser(user) {
  return {
    id: user.uid,
    name: user.displayName || user.email.split("@")[0],
    email: user.email,
    emailVerified: user.emailVerified
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

export function subscribeToAuth(callback, onError) {
  try {
    const { auth } = ensureFirebase();
    return onAuthStateChanged(
      auth,
      (user) => {
        if (user && !user.emailVerified) {
          onError("Please verify your NUS email before using FindIT.");
          signOut(auth);
          callback(null);
          return;
        }

        callback(user ? publicUser(user) : null);
      },
      (error) => onError(mapFirebaseError(error))
    );
  } catch (error) {
    onError(error.message);
    callback(null);
    return () => {};
  }
}

export async function registerUser({ name, email, password }) {
  if (!isNusEmail(email)) {
    throw new Error("Please register with an NUS email address.");
  }

  try {
    const { auth, db } = ensureFirebase();
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    await sendEmailVerification(credential.user);
    await setDoc(doc(db, "users", credential.user.uid), {
      name: name.trim(),
      email: credential.user.email,
      emailVerified: false,
      createdAt: serverTimestamp()
    });

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

    await updateDoc(doc(db, "users", credential.user.uid), {
      emailVerified: true
    });

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

export async function fetchItems() {
  const { db } = ensureFirebase();
  const snapshot = await getDocs(query(collection(db, "items"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((itemDoc) => {
    const item = itemDoc.data();
    return {
      id: itemDoc.id,
      ...item,
      createdAt: item.createdAt?.toDate?.().toISOString?.() || item.createdAt || new Date().toISOString()
    };
  });
}

export async function fetchClaims(itemId) {
  const { db } = ensureFirebase();
  const snapshot = await getDocs(query(collection(db, "items", itemId, "claims"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((claimDoc) => {
    const claim = claimDoc.data();
    return {
      id: claimDoc.id,
      ...claim,
      createdAt: claim.createdAt?.toDate?.().toISOString?.() || claim.createdAt || new Date().toISOString()
    };
  });
}

export async function createItemReport({ currentUser, imageFile, report }) {
  if (!imageFile) {
    throw new Error("Please upload an item photo before saving the report.");
  }

  const { db, storage } = ensureFirebase();
  const extension = imageFile.name.split(".").pop() || "jpg";
  const imagePath = `items/${currentUser.id}/${crypto.randomUUID()}.${extension}`;
  const imageRef = ref(storage, imagePath);

  await uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
  const imageUrl = await getDownloadURL(imageRef);

  const item = {
    type: report.type,
    title: report.title.trim(),
    description: report.description.trim(),
    location: report.location.trim(),
    category: report.category || "Other",
    imageUrl,
    imagePath,
    imageSignature: report.imageSignature || null,
    searchKeywords: report.searchKeywords || [],
    status: "open",
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "items"), item);

  return {
    id: docRef.id,
    ...item,
    createdAt: new Date().toISOString()
  };
}

export async function createClaim({ item, currentUser, claim }) {
  if (item.userId === currentUser.id) {
    throw new Error("You cannot claim your own report.");
  }

  if (!claim.message.trim() || !claim.contact.trim()) {
    throw new Error("Please add a message and contact details.");
  }

  const { db } = ensureFirebase();
  const claimBody = {
    itemId: item.id,
    itemOwnerId: item.userId,
    claimantId: currentUser.id,
    claimantName: currentUser.name,
    claimantEmail: currentUser.email,
    message: claim.message.trim(),
    contact: claim.contact.trim(),
    status: "open",
    createdAt: serverTimestamp()
  };

  const claimRef = await addDoc(collection(db, "items", item.id, "claims"), claimBody);

  return {
    id: claimRef.id,
    ...claimBody,
    createdAt: new Date().toISOString()
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
