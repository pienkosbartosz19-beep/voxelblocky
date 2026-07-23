/**
 * Smoke test logiki Second Brain / AIDolek bez FAISS/Ollama.
 * Uruchom: node scripts/smoke-second-brain.mjs
 */
import { createHash } from "crypto";
import assert from "assert";

function getCacheKey(query, type = "text") {
  const hash = createHash("sha256").update(query).digest("hex");
  return `embedding:${type}:${hash}`;
}

function assembleContext(contextResults) {
  const parts = [];
  for (const doc of contextResults) {
    if (doc.metadata?.type === "image") {
      let line = `[Obraz: ${doc.metadata.source || "unknown"}]`;
      if (doc.metadata.description) line += ` — ${doc.metadata.description}`;
      else if (doc.pageContent) line += ` — ${doc.pageContent}`;
      parts.push(line);
    } else if (doc.pageContent) {
      parts.push(doc.pageContent);
    }
  }
  return parts.join("\n\n");
}

// 1. Klucze cache różnią się po type
const kText = getCacheKey("diagram", "text");
const kImage = getCacheKey("diagram", "image");
assert.notStrictEqual(kText, kImage);
assert.ok(kText.startsWith("embedding:text:"));
assert.ok(kImage.startsWith("embedding:image:"));

// 2. Ten sam query → ten sam klucz
assert.strictEqual(getCacheKey("abc", "text"), getCacheKey("abc", "text"));

// 3. Składanie kontekstu multimodalnego
const ctx = assembleContext([
  { pageContent: "Second Brain przechowuje notatki.", metadata: { type: "text" } },
  {
    pageContent: "[IMAGE] avatar.jpg",
    metadata: {
      type: "image",
      source: "avatar.jpg",
      description: "Awatar AI",
    },
  },
]);
assert.ok(ctx.includes("Second Brain"));
assert.ok(ctx.includes("[Obraz: avatar.jpg]"));
assert.ok(ctx.includes("Awatar AI"));

console.log("smoke-second-brain: OK");
console.log(" - cache keys OK");
console.log(" - assembleContext OK");
