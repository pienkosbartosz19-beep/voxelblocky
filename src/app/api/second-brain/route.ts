import { VectorStore } from "@/lib/vectorStore";
import { DocumentLoader } from "@/lib/documentLoader/documentLoader";
import { Document } from "langchain/document";
import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const query = formData.get("query") as string;
    const files = formData.getAll("files") as File[];

    if (action === "search" && query) {
      const type = ((formData.get("type") as string) || "text") as
        | "text"
        | "image";
      const results = await VectorStore.similaritySearch(query, 3, type);
      return NextResponse.json({ results });
    }

    if (action === "search-with-score" && query) {
      const type = ((formData.get("type") as string) || "text") as
        | "text"
        | "image";
      const results = await VectorStore.similaritySearchWithScore(
        query,
        3,
        type
      );
      return NextResponse.json({ results });
    }

    if (action === "upload" && files.length > 0) {
      const documents: Document[] = [];
      const tempPaths: string[] = [];

      try {
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const tempFilePath = path.join(tmpdir(), `sb_${Date.now()}_${fileName}`);
          await writeFile(tempFilePath, Buffer.from(buffer));
          tempPaths.push(tempFilePath);

          const lower = fileName.toLowerCase();
          let loadedDocs: Document[];

          if (lower.endsWith(".pdf")) {
            loadedDocs = await DocumentLoader.loadPDF(tempFilePath);
          } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
            loadedDocs = await DocumentLoader.loadText(tempFilePath);
          } else if (
            lower.endsWith(".png") ||
            lower.endsWith(".jpg") ||
            lower.endsWith(".jpeg") ||
            lower.endsWith(".webp")
          ) {
            loadedDocs = await DocumentLoader.loadImage(tempFilePath);
          } else {
            continue;
          }

          documents.push(
            ...loadedDocs.map((doc) => ({
              ...doc,
              metadata: {
                ...doc.metadata,
                source: fileName,
                originalName: file.name,
              },
            }))
          );
        }

        if (documents.length === 0) {
          return NextResponse.json(
            { error: "No supported files (pdf, txt, md, png, jpg, jpeg, webp)" },
            { status: 400 }
          );
        }

        await VectorStore.addDocuments(documents);
        return NextResponse.json({
          success: true,
          documentsAdded: documents.length,
        });
      } finally {
        await Promise.all(
          tempPaths.map((p) => unlink(p).catch(() => undefined))
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Second Brain API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
