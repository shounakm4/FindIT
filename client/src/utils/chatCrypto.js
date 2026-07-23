const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_PREFIX = "findit.chat.privateKey.";

function toBase64(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

function readKeys(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(userId)) || "null");
  } catch {
    return null;
  }
}

function saveKeys(userId, keys) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(keys));
}

export function hasEncryptionKeys(userId) {
  const keys = readKeys(userId);
  return Boolean(keys?.privateKey && keys?.publicKey);
}

async function getPrivateKey(userId) {
  const keys = readKeys(userId);

  if (!keys?.privateKey) {
    throw new Error("This device does not have your secure chat key. Use the device where you first opened FindIT chat.");
  }

  return crypto.subtle.importKey("jwk", keys.privateKey, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}

async function getConversationKey({ currentUserId, conversationId, otherPublicKey }) {
  const privateKey = await getPrivateKey(currentUserId);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    otherPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const keyMaterial = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("findit-secure-chat"),
      info: encoder.encode(conversationId)
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function createEncryptionKeys(userId) {
  const existingKeys = readKeys(userId);

  if (existingKeys?.publicKey && existingKeys?.privateKey) {
    return existingKeys.publicKey;
  }

  const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  saveKeys(userId, { privateKey, publicKey });
  return publicKey;
}

export async function encryptChatMessage({ currentUserId, conversationId, otherPublicKey, text }) {
  const key = await getConversationKey({ currentUserId, conversationId, otherPublicKey });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(conversationId) },
    key,
    encoder.encode(text)
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv)
  };
}

export async function decryptChatMessage({ currentUserId, conversationId, otherPublicKey, ciphertext, iv }) {
  const key = await getConversationKey({ currentUserId, conversationId, otherPublicKey });
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv), additionalData: encoder.encode(conversationId) },
    key,
    fromBase64(ciphertext)
  );

  return decoder.decode(plaintext);
}
