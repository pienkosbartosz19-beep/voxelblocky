"use server";

import { VectorStore } from "@/lib/vectorStore";
import { DocumentLoader } from "@/lib/documentLoader/documentLoader";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const query = formData.get("query") as string;
    const files = formData.getAll("files") as File[];

    if (action === "search" && query) {
      const type = (formData.get("type") as string) || "text"; // Domyślnie tekst
      const results = await VectorStore.similaritySearch(query, 3, type as "text" | "image");
      return NextResponse.json({ results });
    }

    if (action === "upload" && files.length > 0) {
      const documents: Document[] = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const tempFilePath = path.join(tmpdir(), fileName);

        await writeFile(tempFilePath, Buffer.from(buffer));

        let loadedDocs: Document[];
        if (fileName.endsWith(".pdf")) {
          loadedDocs = await DocumentLoader.loadPDF(tempFilePath);
        } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
          loadedDocs = await DocumentLoader.loadText(tempFilePath);
        } else if (fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
          loadedDocs = await DocumentLoader.loadImage(tempFilePath);
        } else {
          continue;
        }

        documents.push(...loadedDocs);
      }

      await VectorStore.addDocuments(documents);
      return NextResponse.json({ success: true });t VectorStore.addDocuments(documents, metadata);
      return NextResponse.json({ success: true, documentsAdded: documents.length });
    }

    if (action === "search-with-score" && query) {
      const results = await VectorStore.similaritySearchWithScore(query, 3);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Second Brain API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}