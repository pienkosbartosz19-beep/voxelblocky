import { VectorStore } from "@/lib/vectorStore";
import { Document } from "langchain/document";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";

const testVectorStorePath = path.join(process.cwd(), "vector_store_test");

beforeAll(async () => {
  // Clean up test vector store if it exists
  if (fs.existsSync(testVectorStorePath)) {
    fs.rmSync(testVectorStorePath, { recursive: true, force: true });
  }
});

afterAll(async () => {
  // Clean up test vector store
  if (fs.existsSync(testVectorStorePath)) {
    fs.rmSync(testVectorStorePath, { recursive: true, force: true });
  }
});

describe("VectorStore", () => {
  it("should initialize without errors", async () => {
    const instance = await VectorStore.getInstance();
    expect(instance).toBeDefined();
  });

  it("should add documents and perform similarity search", async () => {
    const testDocuments = [
      "OpenClaude to zaawansowane narzędzie do analizy kodu i generowania treści.",
      "Next.js jest frameworkiem do budowania aplikacji webowych opartych na React.",
      "LangChain umożliwia tworzenie zaawansowanych aplikacji z użyciem modeli językowych.",
    ];

    await VectorStore.addDocuments(testDocuments);
    const results = await VectorStore.similaritySearch("Co to jest OpenClaude?", 1);

    expect(results.length).toBe(1);
    expect(results[0].pageContent).toInclude("OpenClaude");
  });

  it("should return documents with scores", async () => {
    const results = await VectorStore.similaritySearchWithScore(
      "Next.js framework",
      1
    );

    expect(results.length).toBe(1);
    expect(results[0][0].pageContent).toInclude("Next.js");
    expect(results[0][1]).toBeNumber();
  });

  it("should handle adding documents with metadata", async () => {
    const testDocuments = ["Testowy dokument z metadanymi"];
    const testMetadata = [{ source: "test", customField: "value" }];

    await VectorStore.addDocuments(testDocuments, testMetadata);
    const results = await VectorStore.similaritySearch("Testowy dokument", 1);

    expect(results.length).toBe(1);
    expect(results[0].metadata.source).toBe("test");
    expect(results[0].metadata.customField).toBe("value");
  });
});