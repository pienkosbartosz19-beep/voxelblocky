"use server";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { createHash } from "crypto";
import { redis } from "./cache"; // Import z cache.ts

// Konfiguracja embeddings (tekst)
const textEmbeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

import { ImageEmbeddings } from "./imageEmbeddings";

// Placeholder dla embeddingów obrazów (CLIP)
// Uwaga: FAISS wymaga tego samego wymiaru embeddingów dla wszystkich dokumentów w jednym indeksie.
// Dlatego obrazy i tekst są przechowywane w osobnych indeksach.

export class VectorStore {
  private static textFaissInstance: FaissStore;
  private static imageFaissInstance: FaissStore;
  private static imageEmbeddings: ImageEmbeddings;

  private constructor() {}

  // Inicjalizacja FAISS dla tekstu
  private static async getTextFaissInstance() {
    if (!VectorStore.textFaissInstance) {
      try {
        VectorStore.textFaissInstance = await FaissStore.load(
          "./vector_store/text",
          textEmbeddings
        );
      } catch {
        VectorStore.textFaissInstance = new FaissStore(textEmbeddings, {});
      }
    }
    return VectorStore.textFaissInstance;
  }

  // Inicjalizacja ImageEmbeddings (CLIP)
  private static async getImageEmbeddings() {
    if (!VectorStore.imageEmbeddings) {
      VectorStore.imageEmbeddings = await ImageEmbeddings.getInstance();
    }
    return VectorStore.imageEmbeddings;
  }

  // Inicjalizacja FAISS dla obrazów
  private static async getImageFaissInstance() {
    if (!VectorStore.imageFaissInstance) {
      const imageEmbeddings = await VectorStore.getImageEmbeddings();
      try {
        VectorStore.imageFaissInstance = await FaissStore.load(
          "./vector_store/image",
          imageEmbeddings
        );
      } catch {
        VectorStore.imageFaissInstance = new FaissStore(imageEmbeddings, {});
      }
    }
    return VectorStore.imageFaissInstance;
  }

  // Generowanie klucza cache na podstawie zapytania
  private static getCacheKey(query: string, type: "text" | "image" = "text"): string {
    const hash = createHash("sha256").update(query).digest("hex");
    return `embedding:${type}:${hash}`;
  }

  public static async addDocuments(documents: Document[]) {
    const textDocs: Document[] = [];
    const imageDocs: Document[] = [];

    // Rozdzielenie dokumentów na tekst i obrazy
    for (const doc of documents) {
      if (doc.metadata?.type === "image") {
        imageDocs.push(doc);
      } else {
        textDocs.push(doc);
      }
    }

    // Przetwarzanie dokumentów tekstowych
    if (textDocs.length > 0) {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
      });
      const textChunks = await splitter.splitDocuments(textDocs);
      const textFaissInstance = await VectorStore.getTextFaissInstance();
      await textFaissInstance.addDocuments(textChunks);
      await textFaissInstance.save("./vector_store/text");
    }

    // Przetwarzanie dokumentów obrazowych
    if (imageDocs.length > 0) {
      const imageFaissInstance = await VectorStore.getImageFaissInstance();
      // Używamy embeddingów z metadanych (wygenerowanych przez CLIP)
      const imageDocumentsWithEmbeddings = imageDocs.map((doc) => {
        if (doc.metadata?.embedding) {
          return {
            pageContent: doc.pageContent,
            metadata: doc.metadata,
            embedding: doc.metadata.embedding, // Embedding z CLIP
          };
        }
        return doc;
      });
      await imageFaissInstance.addDocuments(imageDocumentsWithEmbeddings);
      await imageFaissInstance.save("./vector_store/image");
    }
  }

  public static async similaritySearch(query: string, k: number = 3, type: "text" | "image" = "text") {
    const cacheKey = VectorStore.getCacheKey(query, type);

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
    const faissInstance = type === "text"
      ? await VectorStore.getTextFaissInstance()
      : await VectorStore.getImageFaissInstance();
    const results = await faissInstance.similaritySearch(query, k);

    // Zapis wyników do cache (TTL: 1h)
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("Failed to cache results in Redis:", err);
    }

    return results;
  }

  public static async similaritySearchWithScore(query: string, k: number = 3, type: "text" | "image" = "text") {
    const cacheKey = `${VectorStore.getCacheKey(query, type)}:with_score`;

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
    const faissInstance = type === "text"
      ? await VectorStore.getTextFaissInstance()
      : await VectorStore.getImageFaissInstance();
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