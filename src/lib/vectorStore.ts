"use server";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

export class VectorStore {
  private static instance: FaissStore;
  private static embeddings: OpenAIEmbeddings;

  private constructor() {}

  public static async getInstance() {
    if (!VectorStore.instance) {
      VectorStore.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
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