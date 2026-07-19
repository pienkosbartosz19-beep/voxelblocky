"use server";

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
      }
    }
  }

  return documents;
}