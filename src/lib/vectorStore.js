"use server";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
export class VectorStore {
    static instance;
    static embeddings;
    constructor() { }
    static async getInstance() {
        if (!VectorStore.instance) {
            VectorStore.embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
                model: "text-embedding-3-small",
            });
            try {
                VectorStore.instance = await FaissStore.load("./vector_store", VectorStore.embeddings);
            }
            catch {
                VectorStore.instance = new FaissStore(VectorStore.embeddings, {});
            }
        }
        return VectorStore.instance;
    }
    static async addDocuments(documents, metadata) {
        const instance = await VectorStore.getInstance();
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
            chunkOverlap: 50,
        });
        const docs = documents.map((content, index) => new Document({
            pageContent: content,
            metadata: metadata?.[index] || { source: "user-uploaded" },
        }));
        const chunks = await splitter.splitDocuments(docs);
        await instance.addDocuments(chunks);
        await instance.save("./vector_store");
    }
    static async similaritySearch(query, k = 3) {
        const instance = await VectorStore.getInstance();
        return instance.similaritySearch(query, k);
    }
    static async similaritySearchWithScore(query, k = 3) {
        const instance = await VectorStore.getInstance();
        return instance.similaritySearchWithScore(query, k);
    }
}
