"use server";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { createHash } from "crypto";
import { redis } from "./cache"; // Import z cache.ts

// Konfiguracja embeddings
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

export class VectorStore {
  private static faissInstance: FaissStore;

  private constructor() {}

  // Inicjalizacja FAISS (główna pamięć wektorowa)
  private static async getFaissInstance() {
    if (!VectorStore.faissInstance) {
      try {
        VectorStore.faissInstance = await FaissStore.load(
          "./vector_store",
          embeddings
        );
      } catch {
        VectorStore.faissInstance = new FaissStore(embeddings, {});
      }
    }
    return VectorStore.faissInstance;
  }

  // Generowanie klucza cache na podstawie zapytania
  private static getCacheKey(query: string): string {
    const hash = createHash("sha256").update(query).digest("hex");
    return `embedding:${hash}`;
  }

  public static async addDocuments(documents: string[], metadata?: Record<string, any>[]) {
    const faissInstance = await VectorStore.getFaissInstance();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 50,
    });

    const docs = documents.map((content, index) =>
      new Document({
        pageContent: content,
        metadata: metadata?.[index] || { source: "user-uploaded" },
      })
    );

    const chunks = await splitter.splitDocuments(docs);
    await faissInstance.addDocuments(chunks);
    await faissInstance.save("./vector_store");
  }

  public static async similaritySearch(query: string, k: number = 3) {
    const cacheKey = VectorStore.getCacheKey(query);

    // Próba wyszukiwania w cache Redis
    try {
      const cachedResults = await redis.get(cacheKey);
      if (cachedResults) {
        return JSON.parse(cachedResults);
      }
    } catch (err) {
      console.warn("Redis cache error:", err);
    }

    // Fallback do FAISS
    const faissInstance = await VectorStore.getFaissInstance();
    const results = await faissInstance.similaritySearch(query, k);

    // Zapis wyników do cache (TTL: 1h)
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("Failed to cache results in Redis:", err);
    }

    return results;
  }

  public static async similaritySearchWithScore(query: string, k: number = 3) {
    const cacheKey = `${VectorStore.getCacheKey(query)}:with_score`;

    // Próba wyszukiwania w cache Redis
    try {
      const cachedResults = await redis.get(cacheKey);
      if (cachedResults) {
        return JSON.parse(cachedResults);
      }
    } catch (err) {
      console.warn("Redis cache error:", err);
    }

    // Fallback do FAISS
    const faissInstance = await VectorStore.getFaissInstance();
    const results = await faissInstance.similaritySearchWithScore(query, k);

    // Zapis wyników do cache (TTL: 1h)
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("Failed to cache results in Redis:", err);
    }

    return results;
  }
}