"use server";

import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { pipeline } from "@xenova/transformers";

// Inicjalizacja CLIP (model do wektoryzacji obrazów)
const clipPipeline = await pipeline(
  "feature-extraction",
  "Xenova/clip-vit-base-patch32"
);

async function splitDocuments(documents: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });
  return splitter.splitDocuments(documents);
}

export async function loadPDF(filePath: string): Promise<Document[]> {
  const loader = new PDFLoader(filePath, {
    splitPages: false,
  });
  const docs = await loader.load();
  return splitDocuments(docs);
}

export async function loadText(filePath: string): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  const docs = await loader.load();
  return splitDocuments(docs);
}

// Nowa funkcja: Wektoryzacja obrazów (PNG/JPG)
export async function loadImage(filePath: string): Promise<Document[]> {
  // Konwersja obrazu do tensora (CLIP wymaga formatu 224x224)
  const imageBuffer = await sharp(filePath)
    .resize(224, 224)
    .raw()
    .toBuffer();

  // Wektoryzacja obrazu (CLIP)
  const imageEmbeddings = await clipPipeline(imageBuffer, {
    pooling: "mean",
    normalize: true,
  });

  // Konwersja tensora na tablicę liczb
  const embedding = Array.from(imageEmbeddings.data);

  return [
    new Document({
      pageContent: `[IMAGE] ${path.basename(filePath)}`, // Treść placeholder
      metadata: {
        source: filePath,
        type: "image",
        embedding, // Wektor embeddingów obrazu
      },
    }),
  ];
}

export async function loadDirectory(directoryPath: string): Promise<Document[]> {
  const files = fs.readdirSync(directoryPath);
  let documents: Document[] = [];

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      if (file.endsWith(".pdf")) {
        documents = documents.concat(await loadPDF(filePath));
      } else if (file.endsWith(".txt") || file.endsWith(".md")) {
        documents = documents.concat(await loadText(filePath));
      } else if (file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg")) {
        documents = documents.concat(await loadImage(filePath));
      }
    }
  }

  return documents;
}