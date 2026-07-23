import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { createHash } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import { redis } from "./cache";
import { ImageEmbeddings } from "./imageEmbeddings";

const textEmbeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

const TEXT_STORE_DIR = path.join(process.cwd(), "vector_store", "text");
const IMAGE_STORE_DIR = path.join(process.cwd(), "vector_store", "image");

export class VectorStore {
  private static textFaissInstance: FaissStore | null = null;
  private static imageFaissInstance: FaissStore | null = null;
  private static imageEmbeddings: ImageEmbeddings | null = null;

  private constructor() {}

  private static getCacheKey(
    query: string,
    type: "text" | "image" = "text"
  ): string {
    const hash = createHash("sha256").update(query).digest("hex");
    return `embedding:${type}:${hash}`;
  }

  private static async getTextFaissInstance(): Promise<FaissStore> {
    if (!VectorStore.textFaissInstance) {
      await mkdir(TEXT_STORE_DIR, { recursive: true });
      try {
        VectorStore.textFaissInstance = await FaissStore.load(
          TEXT_STORE_DIR,
          textEmbeddings
        );
      } catch {
        VectorStore.textFaissInstance = new FaissStore(textEmbeddings, {});
      }
    }
    return VectorStore.textFaissInstance;
  }

  private static async getImageEmbeddings(): Promise<ImageEmbeddings> {
    if (!VectorStore.imageEmbeddings) {
      VectorStore.imageEmbeddings = await ImageEmbeddings.getInstance();
    }
    return VectorStore.imageEmbeddings;
  }

  private static async getImageFaissInstance(): Promise<FaissStore> {
    if (!VectorStore.imageFaissInstance) {
      await mkdir(IMAGE_STORE_DIR, { recursive: true });
      const imageEmbeddings = await VectorStore.getImageEmbeddings();
      try {
        VectorStore.imageFaissInstance = await FaissStore.load(
          IMAGE_STORE_DIR,
          imageEmbeddings as unknown as OllamaEmbeddings
        );
      } catch {
        VectorStore.imageFaissInstance = new FaissStore(
          imageEmbeddings as unknown as OllamaEmbeddings,
          {}
        );
      }
    }
    return VectorStore.imageFaissInstance;
  }

  public static async addDocuments(documents: Document[]): Promise<void> {
    const textDocs: Document[] = [];
    const imageDocs: Document[] = [];

    for (const doc of documents) {
      if (doc.metadata?.type === "image") {
        imageDocs.push(doc);
      } else {
        textDocs.push(doc);
      }
    }

    if (textDocs.length > 0) {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
      });
      const textChunks = await splitter.splitDocuments(textDocs);
      const store = await VectorStore.getTextFaissInstance();
      await store.addDocuments(textChunks);
      await store.save(TEXT_STORE_DIR);

      // Placeholdery obrazów też w indeksie tekstowym (wyszukiwanie po nazwie/opisie)
      // — obrazowe wektory CLIP są w osobnym indeksie poniżej.
    }

    if (imageDocs.length > 0) {
      // W indeksie obrazów pageContent = ścieżka pliku (ImageEmbeddings czyta plik)
      const forImageIndex = imageDocs.map(
        (doc) =>
          new Document({
            pageContent: String(doc.metadata?.path || doc.pageContent),
            metadata: doc.metadata,
          })
      );
      try {
        const store = await VectorStore.getImageFaissInstance();
        await store.addDocuments(forImageIndex);
        await store.save(IMAGE_STORE_DIR);
      } catch (err) {
        console.warn(
          "[VectorStore] Image FAISS unavailable, storing image captions in text index only:",
          err
        );
      }

      // Zawsze dodaj caption do indeksu tekstowego — działa bez CLIP
      const captions = imageDocs.map(
        (doc) =>
          new Document({
            pageContent: doc.pageContent,
            metadata: { ...doc.metadata, type: "image" },
          })
      );
      const textStore = await VectorStore.getTextFaissInstance();
      await textStore.addDocuments(captions);
      await textStore.save(TEXT_STORE_DIR);
    }
  }

  public static async similaritySearch(
    query: string,
    k: number = 3,
    type: "text" | "image" = "text"
  ) {
    const cacheKey = VectorStore.getCacheKey(query, type);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("[VectorStore] Redis cache read error:", err);
    }

    let results;
    if (type === "image") {
      try {
        const store = await VectorStore.getImageFaissInstance();
        results = await store.similaritySearch(query, k);
      } catch (err) {
        console.warn(
          "[VectorStore] Image search fallback to text captions:",
          err
        );
        const store = await VectorStore.getTextFaissInstance();
        results = await store.similaritySearch(query, k);
      }
    } else {
      const store = await VectorStore.getTextFaissInstance();
      results = await store.similaritySearch(query, k);
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
    type: "text" | "image" = "text"
  ) {
    const cacheKey = `${VectorStore.getCacheKey(query, type)}:with_score`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("[VectorStore] Redis cache read error:", err);
    }

    let results;
    if (type === "image") {
      try {
        const store = await VectorStore.getImageFaissInstance();
        results = await store.similaritySearchWithScore(query, k);
      } catch {
        const store = await VectorStore.getTextFaissInstance();
        results = await store.similaritySearchWithScore(query, k);
      }
    } else {
      const store = await VectorStore.getTextFaissInstance();
      results = await store.similaritySearchWithScore(query, k);
    }

    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    } catch (err) {
      console.warn("[VectorStore] Redis cache write error:", err);
    }

    return results;
  }
}
