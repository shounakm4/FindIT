import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");

app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await createJsonFileIfMissing(USERS_FILE, []);
  await createJsonFileIfMissing(ITEMS_FILE, []);
}

async function createJsonFileIfMissing(filePath, initialValue) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(initialValue, null, 2));
  }
}

async function readJson(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, savedPassword) {
  const { hash } = hashPassword(password, savedPassword.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(savedPassword.hash, "hex"));
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

async function saveImage(dataUrl) {
  if (!dataUrl) {
    return null;
  }

  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("Please upload a PNG, JPG, JPEG, or WEBP image.");
  }

  const extension = match[2] === "jpeg" ? "jpg" : match[2];
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, Buffer.from(match[3], "base64"));
  return `/uploads/${filename}`;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => !body[field]?.toString().trim());
  if (missing.length > 0) {
    const label = missing.join(", ");
    const error = new Error(`Missing required field(s): ${label}`);
    error.status = 400;
    throw error;
  }
}

app.get("/api/health", (request, response) => {
  response.json({ ok: true, message: "FindIT backend is running." });
});

app.post("/api/auth/register", async (request, response, next) => {
  try {
    requireFields(request.body, ["name", "email", "password"]);

    const users = await readJson(USERS_FILE);
    const email = request.body.email.trim().toLowerCase();
    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      response.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const user = {
      id: crypto.randomUUID(),
      name: request.body.name.trim(),
      email,
      password: hashPassword(request.body.password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await writeJson(USERS_FILE, users);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    requireFields(request.body, ["email", "password"]);

    const users = await readJson(USERS_FILE);
    const email = request.body.email.trim().toLowerCase();
    const user = users.find((candidate) => candidate.email === email);

    if (!user || !verifyPassword(request.body.password, user.password)) {
      response.status(401).json({ error: "Wrong username or password" });
      return;
    }

    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/items", async (request, response, next) => {
  try {
    const items = await readJson(ITEMS_FILE);
    response.json({ items: items.toReversed() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/items", async (request, response, next) => {
  try {
    requireFields(request.body, ["userId", "type", "title", "description", "location"]);

    if (!["lost", "found"].includes(request.body.type)) {
      response.status(400).json({ error: "Item type must be either lost or found." });
      return;
    }

    const users = await readJson(USERS_FILE);
    const owner = users.find((user) => user.id === request.body.userId);

    if (!owner) {
      response.status(401).json({ error: "Please log in before posting an item." });
      return;
    }

    const imageUrl = await saveImage(request.body.imageDataUrl);
    const items = await readJson(ITEMS_FILE);
    const item = {
      id: crypto.randomUUID(),
      type: request.body.type,
      title: request.body.title.trim(),
      description: request.body.description.trim(),
      location: request.body.location.trim(),
      imageUrl,
      status: "open",
      userId: owner.id,
      userName: owner.name,
      createdAt: new Date().toISOString()
    };

    items.push(item);
    await writeJson(ITEMS_FILE, items);
    response.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.message || "Something went wrong on the server."
  });
});

await ensureStorage();

const server = app.listen(PORT, () => {
  console.log(`FindIT backend listening on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error(error);
});
