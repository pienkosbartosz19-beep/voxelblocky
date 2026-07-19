"use server";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { RedisVectorStore } from "@langchain/redis";
import { createClient } from "redis";

// Konfiguracja Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Inicjalizacja klienta Redis (bez await, aby uniknąć blokowania)
redisClient.connect().catch(console.error);

export class VectorStore {
  private static faissInstance: FaissStore;
  private static redisInstance: RedisVectorStore;
  private static embeddings: OllamaEmbeddings;

  private constructor() {}

  // Inicjalizacja FAISS (główna pamięć wektorowa)
  private static async getFaissInstance() {
    if (!VectorStore.faissInstance) {
      VectorStore.embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text",
        baseUrl: "http://localhost:11434",
      });
      try {
        VectorStore.faissInstance = await FaissStore.load(
          "./vector_store",
          VectorStore.embeddings
        );
      } catch {
        VectorStore.faissInstance = new FaissStore(VectorStore.embeddings, {});
      }
    }
    return VectorStore.faissInstance;
  }

  // Inicjalizacja Redis (cache)
  private static async getRedisInstance() {
    if (!VectorStore.redisInstance) {
      VectorStore.redisInstance = new RedisVectorStore(VectorStore.embeddings, {
        indexName: "second_brain",
        redisClient,
        keyPrefix: "doc:",
      });
    }
    return VectorStore.redisInstance;
  }

  public static async addDocuments(documents: string[], metadata?: Record<string, any>[]) {
    const faissInstance = await VectorStore.getFaissInstance();
    const redisInstance = await VectorStore.getRedisInstance();
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

    // Zapis do FAISS (główna pamięć)
    await faissInstance.addDocuments(chunks);
    await faissInstance.save("./vector_store");

    // Zapis do Redis (cache)
    await redisInstance.addDocuments(chunks);
  }

  public static async similaritySearch(query: string, k: number = 3) {
    const redisInstance = await VectorStore.getRedisInstance();

    // Próba wyszukiwania w cache Redis (szybsze)
    try {
      const redisResults = await redisInstance.similaritySearch(query, k);
      if (redisResults.length > 0) {
        return redisResults;
      }
    } catch (err) {
      console.warn("Redis cache miss, falling back to FAISS", err);
    }

    // Fallback do FAISS (główna pamięć)
    const faissInstance = await VectorStore.getFaissInstance();
    return faissInstance.similaritySearch(query, k);
  }

  public static async similaritySearchWithScore(query: string, k: number = 3) {
    const redisInstance = await VectorStore.getRedisInstance();

    // Próba wyszukiwania w cache Redis
    try {
      const redisResults = await redisInstance.similaritySearchWithScore(query, k);
      if (redisResults.length > 0) {
        return redisResults;
      }
    } catch (err) {
      console.warn("Redis cache miss, falling back to FAISS", err);
    }

    // Fallback do FAISS
    const faissInstance = await VectorStore.getFaissInstance();
    return faissInstance.similaritySearchWithScore(query, k);
  }
}