"use server";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

export class VectorStore {
  private static instance: FaissStore;
  private static embeddings: OllamaEmbeddings;

  private constructor() {}

  public static async getInstance() {
    if (!VectorStore.instance) {
      VectorStore.embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text", // Lokalny model embeddingów
        baseUrl: "http://localhost:11434", // Ollama
      });
      try {
        VectorStore.instance = await FaissStore.load(
          "./vector_store",
          VectorStore.embeddings
        );
      } catch {
        VectorStore.instance = new FaissStore(VectorStore.embeddings, {});
      }
    }
    return VectorStore.instance;
  }

  public static async addDocuments(documents: string[], metadata?: Record<string, any>[]) {
    const instance = await VectorStore.getInstance();
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
    await instance.addDocuments(chunks);
    await instance.save("./vector_store");
  }

  public static async similaritySearch(query: string, k: number = 3) {
    const instance = await VectorStore.getInstance();
    return instance.similaritySearch(query, k);
  }

  public static async similaritySearchWithScore(query: string, k: number = 3) {
    const instance = await VectorStore.getInstance();
    return instance.similaritySearchWithScore(query, k);
  }
}