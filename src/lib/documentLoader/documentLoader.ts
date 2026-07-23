import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import fs from "fs";
import path from "path";

async function splitDocuments(documents: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });
  return splitter.splitDocuments(documents);
}

/**
 * Loader dokumentów Second Brain.
 * Obrazy: na start zapisujemy opis/placeholder (awatar/zdjęcie do AIDolek),
 * bez ciężkiego top-level CLIP — CLIP jest w imageEmbeddings (opcjonalnie).
 */
export class DocumentLoader {
  static async loadPDF(filePath: string): Promise<Document[]> {
    const loader = new PDFLoader(filePath, { splitPages: false });
    const docs = await loader.load();
    const chunks = await splitDocuments(docs);
    return chunks.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: path.basename(filePath),
        type: "text",
      },
    }));
  }

  static async loadText(filePath: string): Promise<Document[]> {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    const chunks = await splitDocuments(docs);
    return chunks.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: path.basename(filePath),
        type: "text",
      },
    }));
  }

  static async loadImage(filePath: string): Promise<Document[]> {
    const base = path.basename(filePath);
    return [
      new Document({
        pageContent: `[IMAGE] ${base}`,
        metadata: {
          source: base,
          path: filePath,
          type: "image",
          description: `Obraz użytkownika: ${base}`,
        },
      }),
    ];
  }

  static async loadDirectory(directoryPath: string): Promise<Document[]> {
    const files = fs.readdirSync(directoryPath);
    let documents: Document[] = [];

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) continue;

      if (file.endsWith(".pdf")) {
        documents = documents.concat(await DocumentLoader.loadPDF(filePath));
      } else if (file.endsWith(".txt") || file.endsWith(".md")) {
        documents = documents.concat(await DocumentLoader.loadText(filePath));
      } else if (
        file.endsWith(".png") ||
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg")
      ) {
        documents = documents.concat(await DocumentLoader.loadImage(filePath));
      }
    }

    return documents;
  }
}

// Kompatybilność z bezpośrednimi importami nazwanych funkcji
export const loadPDF = DocumentLoader.loadPDF;
export const loadText = DocumentLoader.loadText;
export const loadImage = DocumentLoader.loadImage;
export const loadDirectory = DocumentLoader.loadDirectory;
