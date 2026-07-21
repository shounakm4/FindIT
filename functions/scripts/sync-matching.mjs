import { cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const functionsDir = resolve(scriptDir, "..");

await cp(resolve(functionsDir, "..", "shared", "matching.js"), resolve(functionsDir, "matching.mjs"));
