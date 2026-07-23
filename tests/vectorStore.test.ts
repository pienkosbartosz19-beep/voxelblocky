import { Document } from "langchain/document";
import { describe, it, expect } from "bun:test";
import { DocumentLoader } from "@/lib/documentLoader/documentLoader";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

function getCacheKey(query: string, type: "text" | "image" = "text"): string {
  const hash = createHash("sha256").update(query).digest("hex");
  return `embedding:${type}:${hash}`;
}

const tmpDir = path.join(process.cwd(), "tmp_test_docs");

describe("Second Brain — logika jednostkowa", () => {
  it("generuje różne klucze cache dla text vs image", () => {
    const a = getCacheKey("diagram", "text");
    const b = getCacheKey("diagram", "image");
    expect(a).not.toBe(b);
    expect(a.startsWith("embedding:text:")).toBe(true);
    expect(b.startsWith("embedding:image:")).toBe(true);
  });

  it("ten sam query daje ten sam klucz", () => {
    expect(getCacheKey("abc", "text")).toBe(getCacheKey("abc", "text"));
  });

  it("DocumentLoader.loadImage oznacza type=image", async () => {
    await mkdir(tmpDir, { recursive: true });
    // minimalny 1x1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const filePath = path.join(tmpDir, "avatar.png");
    await writeFile(filePath, png);

    const docs = await DocumentLoader.loadImage(filePath);
    expect(docs.length).toBe(1);
    expect(docs[0].metadata.type).toBe("image");
    expect(docs[0].pageContent).toInclude("[IMAGE]");
    expect(docs[0].metadata.source).toBe("avatar.png");

    await rm(tmpDir, { recursive: true, force: true });
  });

  it("DocumentLoader.loadText ładuje plik tekstowy", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, "note.md");
    await writeFile(filePath, "Second Brain przechowuje notatki o AIDolek.\n", "utf8");

    const docs = await DocumentLoader.loadText(filePath);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].pageContent).toInclude("Second Brain");
    expect(docs[0].metadata.type).toBe("text");

    await rm(tmpDir, { recursive: true, force: true });
  });

  it("Document[] jest poprawnym kontraktami addDocuments", () => {
    const docs: Document[] = [
      new Document({
        pageContent: "hello",
        metadata: { type: "text", source: "a.txt" },
      }),
      new Document({
        pageContent: "[IMAGE] x.png",
        metadata: { type: "image", source: "x.png" },
      }),
    ];
    expect(docs.filter((d) => d.metadata.type === "image").length).toBe(1);
    expect(docs.filter((d) => d.metadata.type === "text").length).toBe(1);
  });
});
