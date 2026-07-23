import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { redis } from "./cache";

const textEmbeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

const TEXT_STORE_DIR = path.join(process.cwd(), "vector_store", "text");
const IMAGE_STORE_DIR = path.join(process.cwd(), "vector_store", "image");
const TEXT_JSON = path.join(TEXT_STORE_DIR, "docs.json");
const IMAGE_JSON = path.join(IMAGE_STORE_DIR, "docs.json");

type StoreKind = "text" | "image";

/**
 * VectorStore na MemoryVectorStore + JSON (działa na Windows bez faiss-node).
 * Opcjonalnie: jeśli faiss-node działa, można później podmienić backend.
 * Cache wyników: Redis (graceful fallback).
 */
export class VectorStore {
  private static textStore: MemoryVectorStore | null = null;
  private static imageStore: MemoryVectorStore | null = null;
  private static textDocs: Document[] = [];
  private static imageDocs: Document[] = [];

  private constructor() {}

  private static getCacheKey(query: string, type: StoreKind = "text"): string {
    const hash = createHash("sha256").update(query).digest("hex");
    return `embedding:${type}:${hash}`;
  }

  private static async ensureDirs() {
    await mkdir(TEXT_STORE_DIR, { recursive: true });
    await mkdir(IMAGE_STORE_DIR, { recursive: true });
  }

  private static async loadJson(file: string): Promise<Document[]> {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Array<{
        pageContent: string;
        metadata?: Record<string, unknown>;
      }>;
      return parsed.map(
        (d) =>
          new Document({
            pageContent: d.pageContent,
            metadata: d.metadata || {},
          })
      );
    } catch {
      return [];
    }
  }

  private static async saveJson(file: string, docs: Document[]) {
    await writeFile(
      file,
      JSON.stringify(
        docs.map((d) => ({
          pageContent: d.pageContent,
          metadata: d.metadata,
        })),
        null,
        2
      ),
      "utf8"
    );
  }

  private static async getTextStore(): Promise<MemoryVectorStore> {
    if (VectorStore.textStore) return VectorStore.textStore;
    await VectorStore.ensureDirs();
    VectorStore.textDocs = await VectorStore.loadJson(TEXT_JSON);
    VectorStore.textStore = await MemoryVectorStore.fromDocuments(
      VectorStore.textDocs,
      textEmbeddings
    );
    return VectorStore.textStore;
  }

  private static async getImageStore(): Promise<MemoryVectorStore> {
    if (VectorStore.imageStore) return VectorStore.imageStore;
    await VectorStore.ensureDirs();
    VectorStore.imageDocs = await VectorStore.loadJson(IMAGE_JSON);
    // Na start obrazy trzymamy jako caption/placeholder w memory store (Ollama text embeddings)
    VectorStore.imageStore = await MemoryVectorStore.fromDocuments(
      VectorStore.imageDocs,
      textEmbeddings
    );
    return VectorStore.imageStore;
  }

  public static async addDocuments(documents: Document[]): Promise<void> {
    const textDocs: Document[] = [];
    const imageDocs: Document[] = [];

    for (const doc of documents) {
      if (doc.metadata?.type === "image") imageDocs.push(doc);
      else textDocs.push(doc);
    }

    if (textDocs.length > 0) {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
      });
      const chunks = await splitter.splitDocuments(textDocs);
      const store = await VectorStore.getTextStore();
      await store.addDocuments(chunks);
      VectorStore.textDocs.push(...chunks);
      await VectorStore.saveJson(TEXT_JSON, VectorStore.textDocs);
    }

    if (imageDocs.length > 0) {
      const store = await VectorStore.getImageStore();
      await store.addDocuments(imageDocs);
      VectorStore.imageDocs.push(...imageDocs);
      await VectorStore.saveJson(IMAGE_JSON, VectorStore.imageDocs);

      // Caption też w indeksie tekstowym — wyszukiwanie po nazwie/opisie
      const textStore = await VectorStore.getTextStore();
      await textStore.addDocuments(imageDocs);
      VectorStore.textDocs.push(...imageDocs);
      await VectorStore.saveJson(TEXT_JSON, VectorStore.textDocs);
    }
  }

  public static async similaritySearch(
    query: string,
    k: number = 3,
    type: StoreKind = "text"
  ) {
    const cacheKey = VectorStore.getCacheKey(query, type);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("[VectorStore] Redis cache read error:", err);
    }

    const store =
      type === "image"
        ? await VectorStore.getImageStore()
        : await VectorStore.getTextStore();

    let results = await store.similaritySearch(query, k);

    // Fallback: puste image store → caption w text
    if (type === "image" && results.length === 0) {
      const textStore = await VectorStore.getTextStore();
      results = await textStore.similaritySearch(query, k);
    }

    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("[VectorStore] Redis cache write error:", err);
    }

    return results;
  }

  public static async similaritySearchWithScore(
    query: string,
    k: number = 3,
    type: StoreKind = "text"
  ) {
    const cacheKey = `${VectorStore.getCacheKey(query, type)}:with_score`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("[VectorStore] Redis cache read error:", err);
    }

    const store =
      type === "image"
        ? await VectorStore.getImageStore()
        : await VectorStore.getTextStore();

    let results = await store.similaritySearchWithScore(query, k);
    if (type === "image" && results.length === 0) {
      const textStore = await VectorStore.getTextStore();
      results = await textStore.similaritySearchWithScore(query, k);
    }

    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("[VectorStore] Redis cache write error:", err);
    }

    return results;
  }
}
